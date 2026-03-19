import type { ActionsService } from '../actions';
import type { ApiService } from '../api.service';
import type { RequestService } from '../request.service';
import type { FormService } from '../form.service';
import type { InlineService } from '../inline.service';
import type { InlineQueryResolver, KvStore, TelegramStore, TgLoggerFactory } from '../interfaces';
import type { PayloadService } from '../payload';
import type { AllActionsTree } from '../types';
import { InitType } from '../types/init';
import { ContextService } from '../context.service';

export type MwServiceOptions<T extends InitType> = {
  actionsTree: AllActionsTree;
  apiService: ApiService;
  formService: FormService<T>;
  payloadService: PayloadService<T['user']>;
  actionsService: ActionsService;
  inlineService: InlineService<T>;
  requestService: RequestService<T>;
  contextService: ContextService<T>;
  store: TelegramStore;
  kv: KvStore;
  loggerFactory: TgLoggerFactory;
  inlineQueryResolver?: InlineQueryResolver | undefined;
};

export type Middleware = {
  execute(): Promise<void>;
};
