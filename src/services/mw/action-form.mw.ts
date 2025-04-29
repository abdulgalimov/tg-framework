import { getContext } from "../../context";
import { ActionForm, Form } from "../../types";
import { Inject, Injectable } from "../../di";
import { FormService } from "../form.service";
import { ActionsService } from "../actions";
import { PayloadService } from "../payload";

@Injectable()
export class ActionFormMw {
  @Inject(FormService)
  private readonly formService!: FormService;

  @Inject(ActionsService)
  private readonly actionsService!: ActionsService;

  @Inject(PayloadService)
  private readonly payloadService!: PayloadService;

  public async execute(form: Form): Promise<void> {
    const ctx = getContext();
    const { update } = ctx;

    ctx.form = form;
    ctx.payload = form.payload;

    const action = this.actionsService.getById<ActionForm>(form.actionId);

    if (update.message?.message_id) {
      form.historyMessages.push(update.message?.message_id);
      await this.formService.save(form);
    }

    if (update.callback_query) {
      const [callbackAction, payload] = this.payloadService.decode(
        update.callback_query.data || "",
      );

      if (callbackAction.meta.childOf(action)) {
        ctx.action = callbackAction;
        ctx.payload = {
          ...ctx.payload,
          ...payload,
        };
        return;
      }
    }

    if (action.progress) {
      ctx.action = action.progress;
    } else {
      throw new Error("Invalid formAction.progress");
    }
  }
}
