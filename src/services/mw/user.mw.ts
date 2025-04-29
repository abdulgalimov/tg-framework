import { getContext } from "../../context";
import { BaseMw } from "./base.mw";
import { StorageServiceExternal, User } from "../../types";
import { Inject, Injectable, STORAGE_SERVICE_EXT } from "../../di";

@Injectable()
export class UserMw extends BaseMw {
  @Inject(STORAGE_SERVICE_EXT)
  private readonly storage!: StorageServiceExternal;

  public constructor() {
    super(UserMw.name);
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
