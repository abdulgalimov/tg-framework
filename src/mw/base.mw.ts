import type { ActionsService } from '../actions';
import type { ApiService } from '../api.service';
import type { RequestService } from '../request.service';
import type { FormService } from '../form.service';
import type { InlineService } from '../inline.service';
import type { InlineQueryResolver, KvStore, TelegramStore, TgLogger } from '../interfaces';
import type { PayloadService } from '../payload';
import type { AllActionsTree } from '../types';
import type { Middleware, MwServiceOptions } from './types';
import { InitType } from '../types/init';
import { ContextService } from '../context.service';

export abstract class BaseMw<T extends InitType> implements Middleware {
  protected actionsTree: AllActionsTree;

  protected readonly kv: KvStore;

  protected readonly apiService: ApiService;

  protected readonly formService: FormService<T>;

  protected readonly actionsService: ActionsService;

  protected readonly payloadService: PayloadService<T['user']>;

  protected readonly inlineService: InlineService<T>;

  protected readonly requestService: RequestService<T>;

  protected readonly contextService: ContextService<T>;

  protected readonly store: TelegramStore;

  protected readonly inlineQueryResolver: InlineQueryResolver | undefined;

  protected logger: TgLogger;

  protected constructor(name: string, options: MwServiceOptions<T>) {
    this.kv = options.kv;

    this.actionsTree = options.actionsTree;
    this.apiService = options.apiService;
    this.formService = options.formService;
    this.actionsService = options.actionsService;
    this.payloadService = options.payloadService;
    this.inlineService = options.inlineService;
    this.requestService = options.requestService;
    this.contextService = options.contextService;
    this.store = options.store;
    this.inlineQueryResolver = options.inlineQueryResolver;

    this.logger = options.loggerFactory.create(name);
  }

  abstract execute(): Promise<void>;
}
