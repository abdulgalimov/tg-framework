import type { Update } from '@grammyjs/types';

import { Actions, ActionsService } from './actions';
import { ApiService } from './api.service';
import { CallService } from './call.service';
import type { TelegramConfig } from './types';
import { type ContextAny } from './context';
import { RequestService } from './request.service';
import { FormService } from './form.service';
import { InlineService } from './inline.service';
import { KvStore, TelegramStore, TgLogger, TgLoggerFactory } from './interfaces';
import { InlineKeyboardService, ReplyKeyboardService } from './keyboard';
import { MiddlewaresService } from './mw';
import { PayloadService } from './payload';
import { LocaleServiceOptions, UpdateHandler } from './types';
import { UpdateService } from './update.service';
import { LocaleService } from './locale.service';
import { InitType } from './types';
import { ContextService } from './context';
import { Handlers, HandlersService } from './handlers.service';
import { InfoService } from './info.service';

export type TelegramOptions<T extends InitType> = {
  config: TelegramConfig;
  actionsTree: T['tree'];
  loggerFactory: TgLoggerFactory;
};

export type CreateOptions = {
  store: TelegramStore;
  kv: KvStore;
  locale: LocaleServiceOptions;
  defaultHandler?: UpdateHandler;
};

export class Telegram<T extends InitType> {
  private readonly logger: TgLogger;

  private readonly config: TelegramConfig;

  private readonly actionsTree: T['tree'];

  private readonly loggerFactory: TgLoggerFactory;

  private readonly _info: InfoService;

  private readonly _actions: ActionsService<T>;

  private readonly _handlers = new HandlersService<T>();

  public constructor(options: TelegramOptions<T>) {
    const { config, actionsTree, loggerFactory } = options;

    this.config = config;
    this.actionsTree = actionsTree;

    this.loggerFactory = loggerFactory;
    this.logger = this.loggerFactory.create(Telegram.name);
    this.logger.setLogLevel(config.debug.telegramUpdateLevel);

    this._info = new InfoService();
    this._actions = new ActionsService(this.actionsTree);
  }

  private _callService: CallService | undefined;

  private middlewaresService!: MiddlewaresService<T>;

  private _update: UpdateService | undefined;

  private _context: ContextService<T> | undefined;

  private _payload: PayloadService<T> | undefined;

  private _api: ApiService | undefined;

  private _form: FormService<T> | undefined;

  private _request: RequestService<T> | undefined;

  private _inline: InlineService<T> | undefined;

  private _inlineKeyboard: InlineKeyboardService<T> | undefined;

  private _replyKeyboard: ReplyKeyboardService<T> | undefined;

  private _locale: LocaleService<T> | undefined;

  public get info(): InfoService {
    return this._info;
  }

  public get actions(): Actions<T> {
    return this._actions;
  }

  public get handlers(): Handlers<T> {
    return this._handlers;
  }

  public get update(): UpdateService {
    if (!this._update) throw new Error('Telegram is not inited');
    return this._update;
  }

  public get context(): ContextService<T> {
    if (!this._context) throw new Error('Telegram is not inited');
    return this._context;
  }
  public get payload(): PayloadService<T> {
    if (!this._payload) throw new Error('Telegram is not inited');
    return this._payload;
  }
  public get api(): ApiService {
    if (!this._api) throw new Error('Telegram is not inited');
    return this._api;
  }

  public get inline(): InlineService<T> {
    if (!this._inline) throw new Error('Telegram is not inited');
    return this._inline;
  }

  public get request(): RequestService<T> {
    if (!this._request) throw new Error('Telegram is not inited');
    return this._request;
  }

  public get locale(): LocaleService<T> {
    if (!this._locale) throw new Error('Telegram is not inited');
    return this._locale;
  }

  public get inlineKeyboard(): InlineKeyboardService<T> {
    if (!this._inlineKeyboard) throw new Error('Telegram is not inited');
    return this._inlineKeyboard;
  }

  public get form(): FormService<T> {
    if (!this._form) throw new Error('Telegram is not inited');
    return this._form;
  }

  public async create(options: CreateOptions) {
    const { store, locale, kv, defaultHandler } = options;

    const { debug: debugConfig } = this.config;

    this._context = new ContextService();

    this._locale = new LocaleService<T>(this._context, locale);

    this._callService = new CallService(this.config, debugConfig, this.loggerFactory);

    this._actions.init(store.actions);

    this._payload = new PayloadService(
      this._info,
      this._context,
      this._actions,
      store.inlineKeyboards,
      debugConfig,
      this.loggerFactory,
    );

    this._api = new ApiService(this._callService);

    this._replyKeyboard = new ReplyKeyboardService<T>(this._context, store.replyKeyboards);

    this._request = new RequestService<T>(
      this._context,
      this._api,
      this._payload,
      this._replyKeyboard,
      kv,
      this.loggerFactory,
    );

    this._form = new FormService(
      this._context,
      this._request,
      this._actions,
      this._payload,
      this._locale,
      kv,
      this.loggerFactory,
    );

    this._inline = new InlineService(this._context, this._api, kv);

    this._inlineKeyboard = new InlineKeyboardService(
      this._context,
      this._request,
      this._payload,
      this._locale,
    );

    this.middlewaresService = new MiddlewaresService<T>({
      store,
      kv,
      apiService: this._api,
      actionsService: this._actions,
      payloadService: this._payload,
      contextService: this._context,
      formService: this._form,
      inlineService: this._inline,
      loggerFactory: this.loggerFactory,
      replyKeyboard: this._replyKeyboard,
    });

    this._update = new UpdateService({
      callService: this._callService,
      handler: (update) => this.updateHandler(update),
      loggerFactory: this.loggerFactory,
    });

    this.defaultHandler = defaultHandler;
    await this._actions.parse();

    const me = await this.api.call('getMe');
    this._info.init(me.username);

    this._handlers.init();
  }

  private defaultHandler: UpdateHandler | undefined;

  public stop() {
    if (!this._update) {
      throw new Error('Telegram is not inited');
    }

    this._update.stopLongpoll();
  }

  private async updateHandler(update: Update) {
    const requestStore = {
      update,
      flags: {},
    };
    await this.context.createInternal(async () => {
      await this.context.createRequest(requestStore as ContextAny, (ctx) =>
        this.updateWithContext(ctx),
      );

      const internal = this.context.getInternal();
      const { deleteMessages } = internal;
      await Promise.all(
        [...deleteMessages.entries()].map(([chatId, messagesSet]) => {
          return this._api
            ?.call('deleteMessages', {
              chat_id: chatId,
              message_ids: [...messagesSet],
            })
            .catch((err) => {
              this.logger.error('deleteMessages error', {
                chatId,
                messages: [...messagesSet],
                error: err,
              });
            });
        }),
      );
    });
  }

  private async updateWithContext(ctx: ContextAny) {
    const { update } = ctx;

    try {
      this.logger.debug('updateHandler', {
        update,
      });

      await this.middlewaresService.execute();

      await this.tryUpdate(ctx);

      if (update.callback_query && !ctx.flags.callbackAnswered) {
        await this.request.answerCallbackQuery();
      }
    } catch (error) {
      this.logger.error('Telegram update error', {
        error,
        action: ctx.action?.meta.fullKey,
        update,
      });

      throw error;
    }
  }

  private async tryUpdate(ctx: ContextAny, tryCount = 0): Promise<void> {
    const handlers = this._handlers.getHandlers(ctx.action);
    if (!handlers.length && this.defaultHandler) {
      handlers.push(this.defaultHandler);
    }

    if (!handlers.length) {
      return;
    }

    for (const handler of handlers) {
      const result = await handler(ctx);
      if (typeof result === 'object' && result.redirect) {
        if ('action' in result.redirect) {
          if (tryCount > 5) {
            this.logger.error('more try redirect');
            return;
          }

          const { action, payload, callback } = result.redirect;
          ctx.action = action;

          ctx.payload = this.payload.decodePayload(ctx.action, ctx.payload, payload);

          this.logger.debug('redirect', {
            action: ctx.action?.meta.fullKey,
            payload: ctx.payload,
            tryCount,
          });

          await this.tryUpdate(ctx, tryCount + 1);
          if (callback) {
            await callback();
          }
          return;
        }
      }
    }
  }
}
