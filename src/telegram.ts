import type { Update } from '@grammyjs/types';

import { ActionsService } from './actions';
import { ApiService } from './api.service';
import { CallService } from './call.service';
import type { TelegramConfig } from './config';
import { type ContextAny, createContext } from './context';
import { RequestService } from './request.service';
import { FormService } from './form.service';
import { InlineService } from './inline.service';
import type { InlineQueryResolver, KvStore, TelegramStore, TgLoggerFactory } from './interfaces';
import { KeyboardService } from './keyboard.service';
import { MiddlewaresService } from './mw';
import { PayloadService } from './payload';
import type { AllActionsTree, LocaleServiceOptions, UpdateHandler } from './types';
import { UpdateService } from './update.service';
import { LocaleService } from './locale.service';
import { InitType } from './types/init';
import { ContextService } from './context.service';

export type TelegramOptions = {
  store: TelegramStore;
  actionsTree: AllActionsTree;
  kv: KvStore;
  loggerFactory: TgLoggerFactory;
  inlineQueryResolver?: InlineQueryResolver;
  handler: UpdateHandler;
  locale: LocaleServiceOptions;
};

export class Telegram<T extends InitType> {
  private readonly callService: CallService;

  public readonly actions: ActionsService;

  private readonly middlewaresService: MiddlewaresService<T>;

  private readonly updateService: UpdateService;

  public readonly context: ContextService<T>;

  public readonly payload: PayloadService<T>;

  public readonly api: ApiService;

  public readonly form: FormService<T>;

  public readonly request: RequestService<T>;

  public readonly inline: InlineService<T>;

  public readonly keyboard: KeyboardService<T>;

  public readonly locale: LocaleService<T>;

  private readonly logger;

  private readonly handler: UpdateHandler;

  private _username: string | undefined;

  public constructor(telegramConfig: TelegramConfig, options: TelegramOptions) {
    const { debug: debugConfig } = telegramConfig;
    const { store, locale, actionsTree, kv, loggerFactory, inlineQueryResolver, handler } = options;

    this.logger = loggerFactory.create(Telegram.name);
    this.logger.setLogLevel(debugConfig.telegramUpdateLevel);
    this.handler = handler;

    this.context = new ContextService();

    this.locale = new LocaleService<T>(this.context, locale);

    this.callService = new CallService(telegramConfig, debugConfig, loggerFactory);

    this.actions = new ActionsService(actionsTree, store.actions);

    this.payload = new PayloadService(
      this.context,
      this.actions,
      store.keyboardPayloads,
      debugConfig,
      loggerFactory,
    );

    this.api = new ApiService(this.callService);

    this.request = new RequestService<T>(
      this.context,
      actionsTree,
      this.api,
      this.locale,
      this.payload,
      kv,
      loggerFactory,
    );

    this.form = new FormService(
      this.context,
      this.request,
      this.actions,
      this.payload,
      this.locale,
      kv,
      loggerFactory,
    );

    this.inline = new InlineService(this.context, this.api, kv);

    this.keyboard = new KeyboardService(this.context, this.request, this.payload, this.locale);

    this.middlewaresService = new MiddlewaresService<T>({
      store,
      kv,
      actionsTree,
      apiService: this.api,
      actionsService: this.actions,
      payloadService: this.payload,
      contextService: this.context,
      formService: this.form,
      inlineService: this.inline,
      requestService: this.request,
      loggerFactory,
      inlineQueryResolver,
    });

    this.updateService = new UpdateService({
      callService: this.callService,
      handler: (update) => this.updateHandler(update),
      loggerFactory,
    });
  }

  public async init() {
    await this.actions.parse();

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
