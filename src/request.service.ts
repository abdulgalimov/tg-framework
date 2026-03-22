import type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Message,
  ReplyKeyboardMarkup,
} from '@grammyjs/types';

import type { ApiService } from './api.service';
import { CallApiError, TgErrorCodes } from './errors';
import type { KvStore, TgLoggerFactory } from './interfaces';
import type { PayloadService } from './payload';
import type {
  AllActionsTree,
  AnswerCallbackQueryContext,
  AnswerInlineQueryContext,
  EditMessageTextArgs,
  EditMessageTextResult,
  ReplyArgsContext,
  ReplyOptions,
  ReplyResultContext,
  SendMessageArgs,
  SendPhotoArgs,
} from './types';
import { LocaleService } from './locale.service';
import { InitType } from './types/init';
import { ContextService } from './context.service';
import { ReplyKeyboardService } from './keyboard';
import type { ForceReply, ReplyKeyboardRemove } from '@grammyjs/types/markup';

export class RequestService<T extends InitType> {
  private readonly logger;

  public constructor(
    private readonly contextService: ContextService<T>,
    private readonly actionsTree: AllActionsTree,
    private readonly apiService: ApiService,
    private readonly localeService: LocaleService<T>,
    private readonly payloadService: PayloadService<T>,
    private readonly replyKeyboardService: ReplyKeyboardService<T>,
    private readonly kv: KvStore,
    loggerFactory: TgLoggerFactory,
  ) {
    this.logger = loggerFactory.create(RequestService.name);
  }

  public async delete(messageId?: number | number[]): Promise<void> {
    const ctx = this.contextService.get();
    const { user, update } = ctx;

    const chatId =
      update.callback_query?.message?.chat.id || update.message?.chat.id || user.telegramId;

    const currentMessageId =
      update.callback_query?.message?.message_id || update.message?.message_id;
    const deleteMessageId = messageId || currentMessageId;

    if (!chatId) {
      throw new Error('Invalid chatId in context:delete');
    }
    if (!deleteMessageId) {
      throw new Error('Invalid messageId in context:delete');
    }

    if (typeof deleteMessageId === 'number') {
      if (deleteMessageId === currentMessageId) {
        ctx.flags.messageDeleted = true;
      }

      await this.apiService.call('deleteMessage', {
        chat_id: chatId,
        message_id: deleteMessageId,
      });
    } else {
      if (!!currentMessageId && deleteMessageId.includes(currentMessageId)) {
        ctx.flags.messageDeleted = true;
      }

      await this.apiService.call('deleteMessages', {
        chat_id: chatId,
        message_ids: deleteMessageId,
      });
    }

    await this.payloadService.deleteKeyboard(chatId, deleteMessageId);
  }

  /*
  public async send(args: ReplyArgsContext, options?: SendOptions): Promise<void> {
    const ctx = this.contextService.get();
    const { user } = ctx;

    const { hideButton } = options || {};

    const chatId =
      ctx.update?.callback_query?.message?.chat.id ||
      ctx.update?.message?.chat.id ||
      user.telegramId;

    if (!chatId) {
      throw new Error('Invalid chatId in context:send');
    }

    if (hideButton) {
      this.addButton(args, {
        text: this.localeService.text('hide-button'),
        callback_data: this.payloadService.encode(this.actionsTree.core.hide),
      });
    }

    await this.sendOrEdit({
      ...args,
      chat_id: chatId,
    });
  }

  private addButton(args: KeyboardArgs, button: InlineKeyboardButton) {
    const keyboard: InlineKeyboardMarkup = (args.reply_markup as InlineKeyboardMarkup) || {
      inline_keyboard: [],
    };

    keyboard.inline_keyboard.push([button]);

    args.reply_markup = keyboard;
  }
   */

  public async reply(
    args: ReplyArgsContext,
    options?: ReplyOptions | undefined,
  ): Promise<ReplyResultContext> {
    const ctx = this.contextService.get();
    const { user, update } = ctx;

    const chatId = update
      ? update.callback_query?.message?.chat.id ||
        update.message?.chat.id ||
        update.inline_query?.from.id ||
        update.chosen_inline_result?.from.id
      : user.telegramId;

    if (!chatId) {
      throw new Error('Invalid chatId in context:reply');
    }

    const {
      sendMode,
      tryReplyMessage,
      messageId: forceEditMessageId,
      noUpdateLastMessage,
    } = options || {};

    const callbackMessageId = update?.callback_query?.message?.message_id;

    if (args.reply_markup && 'inline_keyboard' in args.reply_markup) {
      args.reply_markup.inline_keyboard.forEach((line) => {
        line.forEach((button) => {
          if ('switch_inline_query_current_chat' in button) {
            if (!button.switch_inline_query_current_chat.endsWith(' ')) {
              button.switch_inline_query_current_chat += ' ';
            }
          }
        });
      });
    }

    let hasTextKeyboard = false;
    if (args.reply_markup && 'keyboard' in args.reply_markup) {
      hasTextKeyboard = args.reply_markup.keyboard.length > 0;
    }

    const { messageDeleted, newMessage: newMessageFlag } = ctx.flags;
    const { newMessage: newMessagePayload } = (ctx.payload as { newMessage?: boolean }) || {};

    const editMessageId = forceEditMessageId || (!messageDeleted ? callbackMessageId : undefined);

    const isFile =
      !!update?.callback_query?.message?.photo || !!update?.callback_query?.message?.document;

    if (isFile) {
      await this.delete();
    }

    if (
      editMessageId &&
      !sendMode &&
      !newMessageFlag &&
      !newMessagePayload &&
      !isFile &&
      !hasTextKeyboard
    ) {
      try {
        return await this.sendOrEdit({
          ...args,
          chat_id: chatId,
          message_id: editMessageId,
        } as EditMessageTextArgs);
      } catch (error) {
        if (error instanceof CallApiError) {
          const callApiError = error as CallApiError;
          if (callApiError.code === TgErrorCodes.MESSAGE_IS_NOT_MODIFIED) {
            return update.callback_query?.message as Message.TextMessage;
          }
        }

        throw error;
      }
    } else {
      const messageId = update?.message?.message_id;
      const sendMessageArgs: SendMessageArgs = {
        chat_id: chatId,
        ...args,
      };
      if (tryReplyMessage && messageId) {
        sendMessageArgs.reply_parameters = {
          message_id: messageId,
        };
      }

      const result = await this.sendOrEdit(sendMessageArgs);

      if (!noUpdateLastMessage) {
        const lastMessageId = await this.kv.getValue<number>(`user_message_id:${user.id}`);
        if (lastMessageId) {
          await this.payloadService.deleteKeyboard(user.telegramId, lastMessageId);

          this.apiService
            .call('deleteMessage', {
              chat_id: user.telegramId,
              message_id: lastMessageId,
            })
            .catch((_error) => {});
        }

        await this.kv.setValue(
          `user_message_id:${user.id}`,
          hasTextKeyboard ? 0 : result.message_id,
        );
      }

      return result;
    }
  }

  public async sendPhoto(args: Omit<SendPhotoArgs, 'chat_id'>) {
    const ctx = this.contextService.get();
    const { user } = ctx;

    const chatId = user.telegramId;

    const sendArgs: SendPhotoArgs = {
      ...args,
      chat_id: user.telegramId,
    };

    const prepareSend = await this.payloadService.prepareSend(sendArgs, chatId);

    let isError = false;
    let messageId: number = 0;
    try {
      const result = await this.apiService.call('sendPhoto', sendArgs);

      messageId = result.message_id;

      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      if (isError) {
        await this.payloadService.revertSend(prepareSend);
      } else {
        await this.payloadService.completeSend(prepareSend, messageId);
      }
    }
  }

  private async sendOrEdit(args: SendMessageArgs | EditMessageTextArgs) {
    const chatId = args.chat_id as number;

    const prepareSend = await this.payloadService.prepareSend(args, chatId);

    let messageId: number = 0;
    let isError = false;
    let sendReplyKeyboard: ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply | undefined;
    try {
      if ('message_id' in args) {
        messageId = args.message_id!;
        try {
          const result = await this.apiService.call('editMessageText', args);

          return result as EditMessageTextResult;
        } catch (editError) {
          this.logger.warn('Failed edit message, try send new message', {
            error: editError,
          });
          const result = await this.apiService.call('sendMessage', args as SendMessageArgs);

          messageId = result.message_id;

          return result;
        }
      } else {
        if (args.reply_markup && !('inline_keyboard' in args.reply_markup)) {
          sendReplyKeyboard = args.reply_markup;
        }
        const result = await this.apiService.call('sendMessage', args as SendMessageArgs);

        messageId = result.message_id;

        return result;
      }
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      console.log('prepareSend', {
        prepareSend,
        sendReplyKeyboard,
      });
      if (isError) {
        await this.payloadService.revertSend(prepareSend);
      } else {
        await this.payloadService.completeSend(prepareSend, messageId);
      }
      if (sendReplyKeyboard) {
        await this.replyKeyboardService.create(messageId, args.text, sendReplyKeyboard);
      }
    }
  }

  public async redirectCallback(url: string) {
    const ctx = this.contextService.get();

    const { update, flags } = ctx;
    if (!update.callback_query || flags.callbackAnswered) {
      return;
    }

    await this.answerCallbackQuery({
      url,
    });
  }

  public async showAlert(text: string) {
    const ctx = this.contextService.get();
    const { update, flags } = ctx;
    if (update.callback_query && !flags.callbackAnswered) {
      await this.answerCallbackQuery({
        text,
        show_alert: true,
      });
      return;
    }

    await this.reply(
      {
        text,
      },
      {
        tryReplyMessage: true,
        sendMode: true,
      },
    );
  }

  public async answerCallbackQuery(args?: AnswerCallbackQueryContext) {
    const ctx = this.contextService.get();

    if (!ctx.update.callback_query) {
      throw new Error('Invalid callback query in context:answerCallbackQuery');
    }

    if (ctx.flags.callbackAnswered) {
      throw new Error('Callback answered');
    }

    const result = await this.apiService.call('answerCallbackQuery', {
      ...args,
      callback_query_id: ctx.update.callback_query.id,
    });

    ctx.flags.callbackAnswered = true;

    return result;
  }

  public async answerInlineQuery(args: AnswerInlineQueryContext) {
    const ctx = this.contextService.get();

    if (!ctx.update.inline_query) {
      throw new Error('Invalid inline query in context:answerInlineQuery');
    }

    if (ctx.flags.inlineAnswered) {
      throw new Error('Inline answered');
    }

    const result = await this.apiService.call('answerInlineQuery', {
      cache_time: 1,
      ...args,
      inline_query_id: ctx.update.inline_query.id,
    });

    ctx.flags.inlineAnswered = true;

    return result;
  }
}
