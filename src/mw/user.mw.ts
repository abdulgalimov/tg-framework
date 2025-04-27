import type { MwServiceOptions } from "./types";
import { getContext } from "../context";
import { BaseMw } from "./base.mw";
import { User } from "../types";

export class UserMw extends BaseMw {
  public constructor(options: MwServiceOptions) {
    super(UserMw.name, options);
  }
  public async execute(): Promise<void> {
    const ctx = getContext();

    const { update } = ctx;

    const from =
      update.message?.from ||
      update.callback_query?.from ||
      update.edited_message?.from ||
      update.my_chat_member?.from ||
      update.inline_query?.from ||
      update.chosen_inline_result?.from;

    if (!from) return;

    const user: User = await this.db.createOrUpdate(from);

    ctx.from = from;
    ctx.user = user;
  }
}
