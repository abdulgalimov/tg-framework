import type { ActionsService } from '../actions';
import type { ApiService } from '../api.service';
import type { ContextService } from '../context.service';
import type { FormService } from '../form.service';
import type { InlineService } from '../inline.service';
import type {
  InlineQueryResolver,
  KvStore,
  TelegramStore,
  TgLoggerFactory,
  TgOtel,
  TgUser,
} from '../interfaces';
import type { PayloadService } from '../payload';
import type { AllActionsTree } from '../types';

export type MwServiceOptions<User extends TgUser> = {
  actionsTree: AllActionsTree;
  apiService: ApiService;
  formService: FormService<User>;
  payloadService: PayloadService<User>;
  actionsService: ActionsService;
  inlineService: InlineService<User>;
  contextService: ContextService<User>;
  store: TelegramStore;
  kv: KvStore;
  otel: TgOtel;
  loggerFactory: TgLoggerFactory;
  inlineQueryResolver?: InlineQueryResolver | undefined;
};

export type Middleware = {
  execute(): Promise<void>;
};
