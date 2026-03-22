import type { InlineKeyboardMarkup } from '@grammyjs/types';

import type { ActionsService } from './actions';
import type { RequestService } from './request.service';
import type { KvStore, TgLoggerFactory } from './interfaces';
import type { PayloadService, UnknownPayload } from './payload';
import type { ActionForm, CreateFormOptions, Form, ReplyArgsContext, ReplyOptions } from './types';
import { InitType } from './types/init';
import { ContextService } from './context.service';
import { LocaleService } from './locale.service';

export class FormService<T extends InitType> {
  // Delete from history the messages entered by the user during the token search process.
  private readonly DELETE_HISTORY_MESSAGES = true;

  private readonly requestService: RequestService<T>;

  private readonly actionsService: ActionsService<T>;

  private readonly payloadService: PayloadService<T>;

  private readonly localeService: LocaleService<T>;

  private readonly kv: KvStore;

  private readonly logger;

  public constructor(
    private readonly contextService: ContextService<T>,
    requestService: RequestService<T>,
    actionsService: ActionsService<T>,
    payloadService: PayloadService<T>,
    localeService: LocaleService<T>,
    kv: KvStore,
    loggerFactory: TgLoggerFactory,
  ) {
    this.requestService = requestService;
    this.actionsService = actionsService;
    this.payloadService = payloadService;
    this.localeService = localeService;
    this.kv = kv;

    this.logger = loggerFactory.create(FormService.name);
  }

  public find(userId: bigint): Promise<Form | null> {
    return this.kv.getValue(`user_form_${userId}`);
  }

  public async create<Data = object, Payload = UnknownPayload>(
    options: CreateFormOptions<Data>,
  ): Promise<Form<Data, Payload>> {
    const ctx = this.contextService.get();
    const { user } = ctx;

    const { action, defaultData } = options;

    const form: Form<Data, Payload> = {
      actionId: action.meta.id,
      userId: user.id,
      data: defaultData || null,
      payload: ctx.payload as Payload,
      historyMessages: [],
    };

    await this.kv.setValue(`user_form_${form.userId}`, form);
    ctx.form = form;

    return form;
  }

  public save(form: Form) {
    return this.kv.setValue(`user_form_${form.userId}`, form);
  }

  public async delete(userId?: bigint): Promise<void> {
    const ctx = this.contextService.get();
    const { user } = ctx;
    const form = ctx.form as Form;

    ctx.form = undefined;

    const deleteMessages: number[] = [];
    if (this.DELETE_HISTORY_MESSAGES) {
      deleteMessages.push(...form.historyMessages);
    }

    if (form.lastMessageId) {
      deleteMessages.push(form.lastMessageId);
    }

    if (deleteMessages.length) {
      try {
        await this.requestService.delete(deleteMessages);
      } catch (error) {
        this.logger.error('delete', {
          deleteMessages,
          error,
        });
      }
    }

    await this.kv.removeValue(`user_form_${userId || user.id}`);
  }

  public async send(args: ReplyArgsContext) {
    const ctx = this.contextService.get();
    const form = ctx.form as Form;

    const result = await this.requestService.reply(args, {
      noUpdateLastMessage: true,
      sendMode: true,
    });

    form.historyMessages.push(result.message_id);

    await this.save(form);
  }

  public async reply(args: ReplyArgsContext, options?: ReplyOptions) {
    const ctx = this.contextService.get();
    const form = ctx.form as Form;

    const action = this.actionsService.getById<ActionForm>(form.actionId);
    if (action.cancel) {
      const keyboard = (args.reply_markup as InlineKeyboardMarkup) || {
        inline_keyboard: [],
      };

      keyboard.inline_keyboard.push([
        {
          text: this.localeService.text('cancel-button'),
          callback_data: this.payloadService.encode(action.cancel),
        },
      ]);

      args.reply_markup = keyboard;
    }

    if (form.lastMessageId) {
      try {
        await this.requestService.delete(form.lastMessageId);
      } catch (error) {
        this.logger.error('delete', {
          messageId: form.lastMessageId,
          error,
        });
      }
    }

    const result = await this.requestService.reply(args, {
      ...options,
      noUpdateLastMessage: true,
    });

    form.lastMessageId = result.message_id;
    await this.save(form);
  }
}
