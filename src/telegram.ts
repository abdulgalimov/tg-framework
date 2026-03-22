import type { Update } from '@grammyjs/types';

import { Actions, ActionsService } from './actions';
import { ApiService } from './api.service';
import { CallService } from './call.service';
import type { TelegramConfig } from './config';
import { type ContextAny, createContext } from './context';
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
import { InitType } from './types/init';
import { ContextService } from './context.service';

export type TelegramOptions<T extends InitType> = {
  config: TelegramConfig;
  actionsTree: T['tree'];
  loggerFactory: TgLoggerFactory;
};

export type CreateOptions = {
  store: TelegramStore;
  kv: KvStore;
  locale: LocaleServiceOptions;
};

export class Telegram<T extends InitType> {
  private readonly logger: TgLogger;

  private readonly config: TelegramConfig;

  private readonly actionsTree: T['tree'];

  private readonly loggerFactory: TgLoggerFactory;

  public constructor(options: TelegramOptions<T>) {
    const { config, actionsTree, loggerFactory } = options;

    this.config = config;
    this.actionsTree = actionsTree;

    this.loggerFactory = loggerFactory;
    this.logger = this.loggerFactory.create(Telegram.name);
    this.logger.setLogLevel(config.debug.telegramUpdateLevel);
  }

  private _callService: CallService | undefined;

  private _actions: ActionsService<T> | undefined;

  private middlewaresService!: MiddlewaresService<T>;

  private updateService!: UpdateService;

  private _context: ContextService<T> | undefined;

  private _payload: PayloadService<T> | undefined;

  private _api: ApiService | undefined;

  private _form: FormService<T> | undefined;

  private _request: RequestService<T> | undefined;

  private _inline: InlineService<T> | undefined;

  private _inlineKeyboard: InlineKeyboardService<T> | undefined;

  private _replyKeyboard: ReplyKeyboardService<T> | undefined;

  private _locale: LocaleService<T> | undefined;

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

  public get actions(): Actions<T> {
    if (!this._actions) throw new Error('Telegram is not inited');
    return this._actions;
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

  public create(options: CreateOptions) {
    const { store, locale, kv } = options;

    const { debug: debugConfig } = this.config;

    this._context = new ContextService();

    this._locale = new LocaleService<T>(this._context, locale);

    this._callService = new CallService(this.config, debugConfig, this.loggerFactory);

    this._actions = new ActionsService(this.actionsTree, store.actions);

    this._payload = new PayloadService(
      this._context,
      this._actions,
      store.inlineKeyboards,
      debugConfig,
      this.loggerFactory,
    );

    this._api = new ApiService(this._callService);

    this._replyKeyboard = new ReplyKeyboardService<T>(
      this._context,
      store.replyKeyboards,
      this._api,
    );

    this._request = new RequestService<T>(
      this._context,
      this._actions.tree,
      this._api,
      this._locale,
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
      requestService: this._request,
      loggerFactory: this.loggerFactory,
      replyKeyboard: this._replyKeyboard,
    });

    this.updateService = new UpdateService({
      callService: this._callService,
      handler: (update) => this.updateHandler(update),
      loggerFactory: this.loggerFactory,
    });
  }

  private _username: string | undefined;

  private handler: UpdateHandler | undefined;

  public async init(handler: UpdateHandler) {
    if (!this._actions) {
      throw new Error('Telegram is not inited');
    }

    this.handler = handler;
    await this._actions.parse();

    const me = await this.api.call('getMe');
    this._username = me.username;

    this.payload.init(this._username);

    this.updateService.startLongpoll();
  }

  public stop() {
    this.updateService.stopLongpoll();
  }

  private async updateHandler(update: Update) {
    const store = {
      update,
      flags: {},
    };
    await createContext(store as ContextAny, (ctx) => this.updateWithContext(ctx));
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
    if (!this.handler) {
      return;
    }

    const result = await this.handler();
    if (typeof result === 'object' && result.redirect) {
      if ('action' in result.redirect) {
        if (tryCount > 5) {
          this.logger.error('more try redirect');
          return;
        }

        const { action, payload, callback } = result.redirect;
        ctx.action = action;

        ctx.payload = this.payload.decodePayload(ctx.action, ctx.payload, payload);

        await this.tryUpdate(ctx, tryCount + 1);
        if (callback) {
          await callback();
        }
      }
    }
  }

  public get username(): string {
    if (!this._username) {
      throw new Error('Telegram is not inited');
    }
    return this._username;
  }

  public get url(): string {
    return `t.me/${this.username}`;
  }
}
