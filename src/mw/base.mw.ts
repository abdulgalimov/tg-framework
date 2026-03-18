import type { ActionsService } from '../actions';
import type { ApiService } from '../api.service';
import type { ContextService } from '../context.service';
import type { FormService } from '../form.service';
import type { InlineService } from '../inline.service';
import type {
  InlineQueryResolver,
  KvStore,
  TelegramStore,
  TgLogger,
  TgOtel,
  TgUser,
} from '../interfaces';
import type { PayloadService } from '../payload';
import type { AllActionsTree } from '../types';
import type { Middleware, MwServiceOptions } from './types';

export abstract class BaseMw<User extends TgUser> implements Middleware {
  protected actionsTree: AllActionsTree;

  protected readonly kv: KvStore;

  protected readonly apiService: ApiService;

  protected readonly formService: FormService<User>;

  protected readonly actionsService: ActionsService;

  protected readonly payloadService: PayloadService<User>;

  protected readonly inlineService: InlineService<User>;

  protected readonly contextService: ContextService<User>;

  protected readonly store: TelegramStore;

  protected readonly otel: TgOtel;

  protected readonly inlineQueryResolver: InlineQueryResolver | undefined;

  protected logger: TgLogger;

  protected constructor(name: string, options: MwServiceOptions<User>) {
    this.kv = options.kv;

    this.actionsTree = options.actionsTree;
    this.apiService = options.apiService;
    this.formService = options.formService;
    this.actionsService = options.actionsService;
    this.payloadService = options.payloadService;
    this.inlineService = options.inlineService;
    this.contextService = options.contextService;
    this.store = options.store;
    this.otel = options.otel;
    this.inlineQueryResolver = options.inlineQueryResolver;

    this.logger = options.loggerFactory.create(name);
  }

  abstract execute(): Promise<void>;
}
