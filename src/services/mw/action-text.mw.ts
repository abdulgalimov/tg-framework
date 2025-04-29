import { type Context, getContext } from "../../context";
import { ActionCore, AllActionsTree } from "../../types";
import { ACTIONS_TREE_EXT, Inject, Injectable } from "../../di";

const commandsReg = /^(?<command>\/\w+)(\s+(?<value>.+))?$/;

@Injectable()
export class ActionTextMw {
  @Inject(ACTIONS_TREE_EXT)
  private readonly actionsTree!: AllActionsTree;

  public async execute(): Promise<void> {
    const ctx = getContext();
    const { update } = ctx;

    const text = update.message?.text;
    if (!text) return;

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
}
