import type { CallbackQuery, InlineQuery } from "@grammyjs/types";
import type { ChosenInlineResult } from "@grammyjs/types/inline";

import { BaseMw } from "./base.mw";
import { type Context, type ContextAny, getContext } from "../../context";
import {
  ActionCore,
  ActionForm,
  ActionInline,
  ActionItemPayload,
  AllActionsTree,
  Form,
  FrameworkConfig,
  InlineChosenPayload,
  InlineQueryPayload,
} from "../../types";
import { CONFIG_KEY, Inject, Injectable } from "../../di";
import { FormService } from "../form.service";
import { ActionsService } from "../actions";
import { PayloadService } from "../payload";
import { InlineService } from "../inline.service";

const commandsReg = /^(?<command>\/\w+)(\s+(?<value>.+))?$/;

@Injectable()
export class ActionsMw extends BaseMw {
  @Inject(FormService)
  private readonly formService!: FormService;

  @Inject(ActionsService)
  private readonly actionsService!: ActionsService;

  @Inject(PayloadService)
  private readonly payloadService!: PayloadService;

  @Inject(InlineService)
  private readonly inlineService!: InlineService;

  private readonly actionsTree: AllActionsTree;

  public constructor(@Inject(CONFIG_KEY) frameworkConfig: FrameworkConfig) {
    super(ActionsMw.name);

    this.actionsTree = frameworkConfig.actionsTree;
  }
  public async execute(): Promise<void> {
    const ctx = getContext();

    const { update, user } = ctx;

    const form = await this.formService.find(user.telegramId);
    if (form) {
      await this.formAction(ctx, form);
      return;
    }

    const text = update.message?.text;
    if (text) {
      this.textAction(ctx, text);
      return;
    }

    if (update.callback_query) {
      this.callbackAction(ctx, update.callback_query);
      return;
    }

    if (update.inline_query) {
      await this.inlineQueryAction(ctx, update.inline_query);
      return;
    }

    if (update.chosen_inline_result) {
      await this.inlineChosenAction(ctx, update.chosen_inline_result);
      return;
    }

    ctx.action = this.actionsTree.core.none;
  }

  private textAction(ctx: ContextAny, text: string): void {
    const commandExec = commandsReg.exec(text);

    if (commandExec && commandExec.groups) {
      const { command, value } = commandExec.groups;
      const commandCtx = ctx as Context<{ action: ActionCore["command"] }>;
      commandCtx.action = this.actionsTree.core.command;

      commandCtx.payload =
        value !== undefined
          ? {
              command: command!,
              value,
            }
          : {
              command: command!,
            };
    } else if (ctx.update.message?.via_bot) {
      ctx.action = this.actionsTree.core.none;
    } else {
      ctx.action = this.actionsTree.core.text;
    }
  }

  private async formAction(
    ctx: Context<{ action: ActionItemPayload }>,
    form: Form,
  ) {
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

  private callbackAction(
    ctx: Context<{ action: ActionItemPayload }>,
    callbackQuery: CallbackQuery,
  ) {
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
