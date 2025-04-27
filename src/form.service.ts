import { type InlineKeyboardMarkup } from "@grammyjs/types/markup";

import { ActionsService } from "./actions";
import { getContext } from "./context";
import type { ContextService } from "./context.service";
import type { LocaleService } from "./locale.service";
import { PayloadService } from "./payload";
import type {
  ActionForm,
  CreateFormOptions,
  Form,
  ReplyArgsContext,
  KeyValueStorage,
} from "./types";
import { Logger } from "./logger";

export class FormService {
  // Delete from history the messages entered by the user during the token search process.
  private readonly DELETE_HISTORY_MESSAGES = true;

  private readonly contextService: ContextService;

  private readonly actionsService: ActionsService;

  private readonly payloadService: PayloadService;

  private readonly localeService: LocaleService;

  private readonly redis: KeyValueStorage;

  private readonly logger = new Logger(FormService.name);

  public constructor(
    contextService: ContextService,
    actionsService: ActionsService,
    payloadService: PayloadService,
    localeService: LocaleService,
    storage: KeyValueStorage,
  ) {
    this.contextService = contextService;
    this.actionsService = actionsService;
    this.payloadService = payloadService;
    this.localeService = localeService;
    this.redis = storage;
  }

  public find(userId: number): Promise<Form | null> {
    return this.redis.getValue(`user_form_${userId}`);
  }

  public async create<Data extends object = object>(
    options: CreateFormOptions,
  ): Promise<Form<Data>> {
    const ctx = getContext();
    const { user } = ctx;

    const { action } = options;

    const form: Form<Data> = {
      actionId: action.meta.id,
      userId: user.telegramId,
      data: {} as Data,
      payload: ctx.payload,
      historyMessages: [],
    };

    await this.redis.setValue(`user_form_${form.userId}`, form);

    return form;
  }

  public save(form: Form) {
    return this.redis.setValue(`user_form_${form.userId}`, form);
  }

  public async delete(userId?: number): Promise<void> {
    const ctx = getContext();
    const { user } = ctx;
    const form = ctx.form as Form;

    ctx.form = undefined;

    const deleteMessages: number[] = [];
    if (this.DELETE_HISTORY_MESSAGES) {
      deleteMessages.push(...form.historyMessages);
    }

    if (
      form.lastMessageId &&
      (!ctx.update.callback_query ||
        ctx.update.callback_query.message?.reply_to_message)
    ) {
      deleteMessages.push(form.lastMessageId);
    }

    if (deleteMessages.length) {
      try {
        await this.contextService.delete(deleteMessages);
      } catch (error) {
        this.logger.error("delete", {
          deleteMessages,
          error,
        });
      }
    }

    await this.redis.del(`user_form_${userId || user.telegramId}`);
  }

  public async reply(args: ReplyArgsContext) {
    const ctx = getContext();
    const form = ctx.form as Form;

    const action = this.actionsService.getById<ActionForm>(form.actionId);
    if (action.cancel) {
      const keyboard = (args.reply_markup as InlineKeyboardMarkup) || {
        inline_keyboard: [],
      };

      keyboard.inline_keyboard.push([
        {
          text: this.localeService.text("cancel-button"),
          callback_data: this.payloadService.encode(action.cancel),
        },
      ]);

      args.reply_markup = keyboard;
    }

    if (form.lastMessageId) {
      try {
        await this.contextService.delete(form.lastMessageId);
      } catch (error) {
        this.logger.error("delete", {
          messageId: form.lastMessageId,
          error,
        });
      }
    }

    const result = await this.contextService.reply(args, {
      tryReplyMessage: true,
    });

    form.lastMessageId = result.message_id;
    await this.save(form);
  }
}
