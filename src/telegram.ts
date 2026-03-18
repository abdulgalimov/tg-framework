import type { Update } from '@grammyjs/types';

import { ActionsService } from './actions';
import { ApiService } from './api.service';
import { CallService } from './call.service';
import type { TelegramConfig } from './config';
import { type ContextAny, createContext } from './context';
import { ContextService } from './context.service';
import { FormService } from './form.service';
import { InlineService } from './inline.service';
import type {
  InlineQueryResolver,
  KvStore,
  TelegramStore,
  TgLocale,
  TgLoggerFactory,
  TgUser,
} from './interfaces';
import { KeyboardService } from './keyboard.service';
import { MiddlewaresService } from './mw';
import { PayloadService } from './payload';
import type { AllActionsTree, UpdateHandler } from './types';
import { UpdateService } from './update.service';

export type TelegramOptions = {
  store: TelegramStore;
  locale: TgLocale;
  actionsTree: AllActionsTree;
  kv: KvStore;
  loggerFactory: TgLoggerFactory;
  inlineQueryResolver?: InlineQueryResolver;
};

export class Telegram<User extends TgUser> {
  private readonly callService: CallService;

  public readonly actions: ActionsService;

  private readonly middlewaresService: MiddlewaresService<User>;

  private readonly updateService: UpdateService;

  public readonly payload: PayloadService<User>;

  public readonly api: ApiService;

  public readonly form: FormService<User>;

  public readonly context: ContextService<User>;

  public readonly inline: InlineService<User>;

  public readonly keyboard: KeyboardService<User>;

  private readonly logger;

  private handler: UpdateHandler | undefined;

  private _username: string | undefined;

  public constructor(telegramConfig: TelegramConfig, options: TelegramOptions) {
    const { debug: debugConfig } = telegramConfig;
    const { store, locale, actionsTree, kv, loggerFactory, inlineQueryResolver } = options;

    this.logger = loggerFactory.create(Telegram.name);
    this.logger.setLogLevel(debugConfig.telegramUpdateLevel);

    this.callService = new CallService(telegramConfig, debugConfig, loggerFactory);

    this.actions = new ActionsService(actionsTree, store.actions);

    this.payload = new PayloadService(
      this.actions,
      store.keyboardPayloads,
      debugConfig,
      loggerFactory,
    );

    this.api = new ApiService(this.callService);

    this.context = new ContextService<User>(
      actionsTree,
      this.api,
      locale,
      this.payload,
      kv,
      loggerFactory,
    );

    this.payload.contextService = this.context;

    this.form = new FormService(
      this.context,
      this.actions,
      this.payload,
      locale,
      kv,
      loggerFactory,
    );

    this.inline = new InlineService(this.api, this.context, kv);

    this.keyboard = new KeyboardService(this.context, this.payload, locale);

    this.middlewaresService = new MiddlewaresService<User>({
      store,
      kv,
      actionsTree,
      apiService: this.api,
      actionsService: this.actions,
      payloadService: this.payload,
      formService: this.form,
      inlineService: this.inline,
      contextService: this.context,
      loggerFactory,
      inlineQueryResolver,
    });

    this.updateService = new UpdateService({
      callService: this.callService,
      handler: (update) => this.updateHandler(update),
      loggerFactory,
    });
  }

  public async init(handler: UpdateHandler) {
    this.handler = handler;

    await this.actions.parse();

    const me = await this.api.getMe({});
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

      if (this.handler) {
        await this.handler(update);
      }

      if (update.callback_query && !ctx.flags.callbackAnswered) {
        await this.context.answerCallbackQuery();
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
