import { ACTIONS_TREE_EXT, Inject, Injectable, LOGGER_TOKEN } from "../../di";
import { type Context, getContext } from "../../context";
import {
  ActionInline,
  ActionItemPayload,
  AllActionsTree,
  InlineChosenPayload,
  InlineQueryPayload,
  LogService,
} from "../../types";
import { PayloadService } from "../payload";
import type { InlineQuery } from "@grammyjs/types";
import type { ChosenInlineResult } from "@grammyjs/types/inline";
import { InlineService } from "../inline.service";
import { ActionsService } from "../actions";

@Injectable()
export class ActionInlineQueryMw {
  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: ActionInlineQueryMw.name,
    },
  })
  private readonly logger!: LogService;

  @Inject(ActionsService)
  private readonly actionsService!: ActionsService;

  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  @Inject(InlineService)
  private readonly inlineService!: InlineService;

  public async execute(): Promise<void> {
    const ctx = getContext();
    const { update, user } = ctx;

    if (update.inline_query) {
      await this.inlineQueryAction(ctx, update.inline_query);
      return;
    }

    if (update.chosen_inline_result) {
      await this.inlineChosenAction(ctx, update.chosen_inline_result);
      return;
    }
  }

  private async inlineQueryAction(
    ctx: Context<{ action: ActionItemPayload }>,
    inlineQuery: InlineQuery,
  ) {
    const findResult = await this.inlineService.find(inlineQuery.query);
    if (!findResult) {
      ctx.action = this.actionsTree.core.none;
      return;
    }

    const [inlineData, variables] = findResult;

    ctx.action = this.actionsService.getById(inlineData.actionId);
    ctx.inline = inlineData;
    ctx.payload = {
      variables,
    } satisfies InlineQueryPayload;
  }

  private async inlineChosenAction(
    ctx: Context<{ action: ActionItemPayload }>,
    chosenInline: ChosenInlineResult,
  ) {
    const findResult = await this.inlineService.find(chosenInline.query);
    if (!findResult) {
      ctx.action = this.actionsTree.core.none;
      return;
    }

    const [inlineData, variables] = findResult;

    const action = this.actionsService.getById<ActionInline>(
      inlineData.actionId,
    );
    ctx.action = action.select;
    ctx.inline = inlineData;
    ctx.payload = {
      variables,
      selectId: chosenInline.result_id,
    } satisfies InlineChosenPayload;
  }
}
