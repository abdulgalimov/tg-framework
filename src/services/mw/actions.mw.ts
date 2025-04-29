import { getContext } from "../../context";
import { AllActionsTree } from "../../types";
import { ACTIONS_TREE_EXT, Inject, Injectable } from "../../di";
import { FormService } from "../form.service";
import type { Middleware } from "./types";
import { ActionTextMw } from "./action-text.mw";
import { ActionCbQueryMw } from "./action-cb-query.mw";
import { ActionInlineQueryMw } from "./action-inline-query.mw";
import { ActionFormMw } from "./action-form.mw";

@Injectable()
export class ActionsMw implements Middleware {
  @Inject(FormService)
  private readonly formService!: FormService;

  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  @Inject(ActionTextMw)
  private readonly actionTextMw!: ActionTextMw;

  @Inject(ActionCbQueryMw)
  private readonly actionCbQueryMw!: ActionCbQueryMw;

  @Inject(ActionInlineQueryMw)
  private readonly actionInlineQueryMw!: ActionInlineQueryMw;

  @Inject(ActionFormMw)
  private readonly actionFormMw!: ActionFormMw;

  public async execute(): Promise<void> {
    const ctx = getContext();

    const { update, user } = ctx;

    const form = await this.formService.find(user.telegramId);
    if (form) {
      await this.actionFormMw.execute(form);
      return;
    }

    if (update.message?.text) {
      await this.actionTextMw.execute();
      return;
    }

    if (update.callback_query) {
      await this.actionCbQueryMw.execute();
      return;
    }

    if (update.inline_query || update.chosen_inline_result) {
      await this.actionInlineQueryMw.execute();
      return;
    }

    ctx.action = this.actionsTree.core.none;
  }
}
