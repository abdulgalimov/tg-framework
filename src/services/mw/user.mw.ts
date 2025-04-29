import { getContext } from "../../context";
import { BaseMw } from "./base.mw";
import { DataStorage, FrameworkConfig, User } from "../../types";
import { CONFIG_KEY, Inject, Injectable } from "../../di";

@Injectable()
export class UserMw extends BaseMw {
  private readonly storage: DataStorage;

  public constructor(@Inject(CONFIG_KEY) frameworkConfig: FrameworkConfig) {
    super(UserMw.name);

    this.storage = frameworkConfig.storage;
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

    const user: User = await this.storage.createUser(from);

    ctx.from = from;
    ctx.user = user;
  }
}
