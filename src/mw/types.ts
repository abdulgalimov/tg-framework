import type { ActionsService } from "../actions";
import type { ApiService } from "../api.service";
import type { FormService } from "../form.service";
import type { InlineService } from "../inline.service";
import type { PayloadService } from "../payload";
import type { AllActionsTree, Db, KeyValueStorage } from "../types";

export type MwServiceOptions = {
  actionsTree: AllActionsTree;
  apiService: ApiService;
  formService: FormService;
  payloadService: PayloadService;
  actionsService: ActionsService;
  inlineService: InlineService;
  db: Db;
  storage: KeyValueStorage;
};

export type Middleware = {
  execute(): Promise<void>;
};
