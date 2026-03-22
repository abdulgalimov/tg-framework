import type { ActionsService } from '../actions';
import type { ApiService } from '../api.service';
import type { RequestService } from '../request.service';
import type { FormService } from '../form.service';
import type { InlineService } from '../inline.service';
import type { KvStore, TelegramStore, TgLoggerFactory } from '../interfaces';
import type { PayloadService } from '../payload';
import { InitType } from '../types/init';
import { ContextService } from '../context.service';
import { ReplyKeyboardService } from '../keyboard';

export type MwServiceOptions<T extends InitType> = {
  apiService: ApiService;
  formService: FormService<T>;
  payloadService: PayloadService<T>;
  actionsService: ActionsService<T>;
  inlineService: InlineService<T>;
  requestService: RequestService<T>;
  contextService: ContextService<T>;
  store: TelegramStore;
  kv: KvStore;
  loggerFactory: TgLoggerFactory;
  replyKeyboard: ReplyKeyboardService<T>;
};

export type Middleware = {
  execute(): Promise<void>;
};
