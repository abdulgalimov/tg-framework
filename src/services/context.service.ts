import type {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
} from "@grammyjs/types/markup";
import type { Message } from "@grammyjs/types/message";

import { ApiService } from "./api.service";
import { getContext } from "../context";
import { CallApiError, TgErrorCodes } from "../errors";
import { LocaleService } from "./locale.service";
import { PayloadService } from "./payload";
import type {
  AllActionsTree,
  AnswerCallbackQueryContext,
  AnswerInlineQueryContext,
  EditMessageTextArgs,
  EditMessageTextResult,
  FrameworkOptions,
  KeyboardArgs,
  ReplyArgsContext,
  ReplyOptions,
  ReplyResultContext,
  SendMessageArgs,
} from "../types";
import { CONFIG_KEY, Inject, Injectable } from "../di";

@Injectable()
export class ContextService {
  @Inject(LocaleService)
  private readonly localeService!: LocaleService;

  @Inject(ApiService)
  private readonly apiService!: ApiService;

  @Inject(PayloadService)
  private readonly payloadService!: PayloadService;

  private readonly actionsTree: AllActionsTree;

  public constructor(@Inject(CONFIG_KEY) frameworkConfig: FrameworkOptions) {
    this.actionsTree = frameworkConfig.actionsTree;
  }

  public async delete(messageId?: number | number[]): Promise<void> {
    const ctx = getContext();
    const { user, update } = ctx;

    const chatId =
      update.callback_query?.message?.chat.id ||
      update.message?.chat.id ||
      user.telegramId;
    const deleteMessageId =
      messageId || update.callback_query?.message?.message_id;

    if (!chatId) {
      throw new Error("Invalid chatId in context:delete");
    }
    if (!deleteMessageId) {
      throw new Error("Invalid messageId in context:delete");
    }

    ctx.flags.messageDeleted = true;

    if (typeof deleteMessageId === "number") {
      await this.apiService.deleteMessage({
        chat_id: chatId,
        message_id: deleteMessageId,
      });
    } else {
      await this.apiService.deleteMessages({
        chat_id: chatId,
        message_ids: deleteMessageId,
      });
    }
  }

  public async send(args: ReplyArgsContext): Promise<void> {
    const ctx = getContext();

    const chatId =
      ctx.update.callback_query?.message?.chat.id ||
      ctx.update.message?.chat.id;

    if (!chatId) {
      throw new Error("Invalid chatId in context:send");
    }

    await this.apiService.sendMessage({
      ...args,
      chat_id: chatId,
    });
  }

  public addButton(args: KeyboardArgs, button: InlineKeyboardButton) {
    const keyboard: InlineKeyboardMarkup =
      (args.reply_markup as InlineKeyboardMarkup) || {
        inline_keyboard: [],
      };

    keyboard.inline_keyboard.push([button]);

    args.reply_markup = keyboard;
  }

  public async reply(
    args: ReplyArgsContext,
    options?: ReplyOptions,
  ): Promise<ReplyResultContext> {
    const ctx = getContext();
    const { update } = ctx;

    const chatId =
      update.callback_query?.message?.chat.id ||
      update.message?.chat.id ||
      update.chosen_inline_result?.from.id;
    const callbackMessageId = update.callback_query?.message?.message_id;

    if (!chatId) {
      throw new Error("Invalid chatId in context:reply");
    }

    const { sendMode, tryReplyMessage, hideButton } = options || {};

    if (hideButton) {
      this.addButton(args, {
        text: this.localeService.text("hide-button"),
        callback_data: this.payloadService.encode(this.actionsTree.core.hide),
      });
    }

    if (callbackMessageId && !sendMode && !ctx.flags.messageDeleted) {
      try {
        return (await this.apiService.editMessageText({
          ...args,
          chat_id: chatId,
          message_id: callbackMessageId,
        } as EditMessageTextArgs)) as EditMessageTextResult;
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
      const messageId = update.message?.message_id;
      const sendMessageArgs: SendMessageArgs = {
        chat_id: chatId,
        ...args,
      };
      if (tryReplyMessage && messageId) {
        sendMessageArgs.reply_parameters = {
          message_id: messageId,
        };
      }
      return await this.apiService.sendMessage(sendMessageArgs);
    }
  }

  public async showAlert(text: string) {
    const ctx = getContext();
    if (ctx.update.callback_query) {
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
        hideButton: true,
      },
    );
  }

  public async answerCallbackQuery(args?: AnswerCallbackQueryContext) {
    const ctx = getContext();

    if (!ctx.update.callback_query) {
      throw new Error("Invalid callback query in context:answerCallbackQuery");
    }

    if (ctx.flags.callbackAnswered) {
      throw new Error("Callback answered");
    }

    const result = await this.apiService.answerCallbackQuery({
      ...args,
      callback_query_id: ctx.update.callback_query.id,
    });

    ctx.flags.callbackAnswered = true;

    return result;
  }

  public async answerInlineQuery(args: AnswerInlineQueryContext) {
    const ctx = getContext();

    if (!ctx.update.inline_query) {
      throw new Error("Invalid inline query in context:answerInlineQuery");
    }

    if (ctx.flags.inlineAnswered) {
      throw new Error("Inline answered");
    }

    const result = await this.apiService.answerInlineQuery({
      cache_time: 1,
      ...args,
      inline_query_id: ctx.update.inline_query.id,
    });

    ctx.flags.inlineAnswered = true;

    return result;
  }
}
