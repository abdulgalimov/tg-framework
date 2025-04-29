import { getContext } from "../../context";
import { LogService, StorageServiceExternal, User } from "../../types";
import {
  Inject,
  Injectable,
  LOGGER_TOKEN,
  STORAGE_SERVICE_EXT,
} from "../../di";
import { Middleware } from "./types";

@Injectable()
export class UserMw implements Middleware {
  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: UserMw.name,
    },
  })
  private readonly logger!: LogService;

  @Inject(STORAGE_SERVICE_EXT)
  private readonly storage!: StorageServiceExternal;

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
