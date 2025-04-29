import { ACTIONS_TREE_EXT, Inject, Injectable, LOGGER_TOKEN } from "../../di";
import { getContext } from "../../context";
import { AllActionsTree, LogService } from "../../types";
import { PayloadService } from "../payload";

@Injectable()
export class ActionCbQueryMw {
  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: ActionCbQueryMw.name,
    },
  })
  private readonly logger!: LogService;

  @Inject(PayloadService)
  private readonly payloadService!: PayloadService;

  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  public async execute(): Promise<void> {
    const ctx = getContext();
    const { update, user } = ctx;

    const callbackQuery = update.callback_query;
    if (!callbackQuery) return;

    try {
      const [action, payload] = this.payloadService.decode(
        callbackQuery.data || "",
      );

      ctx.action = action;
      ctx.payload = payload;
    } catch (error) {
      this.logger.error("Failed decode payload", error, {
        callbackData: callbackQuery.data,
      });

      ctx.action = this.actionsTree.core.none;
    }
  }
}
