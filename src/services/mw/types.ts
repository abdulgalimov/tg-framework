import type { ActionsService } from "../actions";
import type { ApiService } from "../api.service";
import type { FormService } from "../form.service";
import type { InlineService } from "../inline.service";
import type { PayloadService } from "../payload";
import type { AllActionsTree, DataStorage } from "../../types";

export type Middleware = {
  execute(): Promise<void>;
};
