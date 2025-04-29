import type { Update } from "@grammyjs/types";

import {
  ActionsService,
  ApiService,
  ContextService,
  MiddlewaresService,
  PayloadService,
  UpdateService,
} from "./services";
import { AllActionsTree, LogService, UpdateResult } from "./types";
import { type ContextAny, createContext, getContext } from "./context";
import {
  ACTIONS_TREE_EXT,
  diContainer,
  ENTRY_SERVICE_EXT,
  Inject,
  Injectable,
  LOGGER_TOKEN,
} from "./di";

@Injectable()
export class Telegram<EntryService> {
  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: Telegram.name,
    },
  })
  private readonly logger!: LogService;

  @Inject(ActionsService)
  private readonly actions!: ActionsService;

  @Inject(UpdateService)
  private readonly updateService!: UpdateService;

  @Inject(PayloadService)
  private readonly payload!: PayloadService;

  @Inject(ApiService)
  private readonly api!: ApiService;

  @Inject(ContextService)
  private readonly context!: ContextService;

  @Inject(MiddlewaresService)
  private readonly middlewaresService!: MiddlewaresService;

  @Inject(ENTRY_SERVICE_EXT)
  public readonly entryService!: EntryService;

  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  private _username: string = "";

  public async init() {
    await this.actions.parse();

    this.updateService.setHandler((update) => this.onUpdate(update));

    const me = await this.api.methods.getMe({});
    this._username = me.username;
  }

  public startLongpoll() {
    this.updateService.startLongpoll().catch(this.logger.error);
  }

  public async onUpdate(update: Update) {
    try {
      const store = {
        update,
        flags: {},
      };
      await createContext(store as ContextAny, () =>
        this.updateWithContext(update),
      );
    } catch (error) {
      this.logger.error("Update handler", error);
    }
  }

  private async updateWithContext(update: Update) {
    const ctx = getContext();

    await this.middlewaresService.execute();
    if (!ctx.action) {
      ctx.action = this.actionsTree.core.none;
    }

    try {
      await this.tryHandler(ctx, 1);
    } catch (error) {
      this.logger.error("Update handler", error);
    }

    if (update.callback_query && !ctx.flags.callbackAnswered) {
      await this.context.answerCallbackQuery();
    }
  }

  private async tryHandler(
    ctx: ContextAny,
    tryCount: number,
  ): Promise<UpdateResult> {
    const updateTarget = diContainer.getUpdateTarget();
    let result: UpdateResult;
    if (updateTarget !== null) {
      const { target, key } = updateTarget;

      result = await target[key]();
    } else {
      return;
    }

    if (typeof result === "object" && result.redirect) {
      const { action, payload } = result.redirect;
      ctx.action = action;

      ctx.payload = this.payload.parse(ctx.action, ctx.payload, payload);

      if (tryCount < 5) {
        await this.tryHandler(ctx, tryCount + 1);
      }
    }
  }

  public get username(): string {
    return this._username;
  }
}
