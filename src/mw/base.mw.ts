import type { Middleware, MwServiceOptions } from "./types";
import type { ActionsService } from "../actions";
import type { ApiService } from "../api.service";
import type { FormService } from "../form.service";
import type { InlineService } from "../inline.service";
import type { PayloadService } from "../payload";
import type { AllActionsTree, DataStorage } from "../types";
import { Logger } from "../logger";

export abstract class BaseMw implements Middleware {
  protected actionsTree: AllActionsTree;

  protected readonly storage: DataStorage;

  protected readonly formService: FormService;

  protected readonly actionsService: ActionsService;

  protected readonly payloadService: PayloadService;

  protected readonly inlineService: InlineService;

  protected logger: Logger;

  protected constructor(name: string, options: MwServiceOptions) {
    this.actionsTree = options.actionsTree;
    this.formService = options.formService;
    this.actionsService = options.actionsService;
    this.payloadService = options.payloadService;
    this.inlineService = options.inlineService;
    this.storage = options.storage;

    this.logger = new Logger(name);
  }

  abstract execute(): Promise<void>;
}
