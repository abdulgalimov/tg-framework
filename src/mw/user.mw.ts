import type { ContextAny } from '../context';
import type { TgUser } from '../interfaces';
import { BaseMw } from './base.mw';
import type { MwServiceOptions } from './types';

export class UserMw<User extends TgUser> extends BaseMw<User> {
  public constructor(options: MwServiceOptions<User>) {
    super(UserMw.name, options);
  }
  public async execute(): Promise<void> {
    const ctx = this.contextService.get();

    await this.getUser(ctx);
  }

  private async getUser(ctx: ContextAny) {
    const { update } = ctx;
    const from =
      update.message?.from ||
      update.callback_query?.from ||
      update.edited_message?.from ||
      update.my_chat_member?.from ||
      update.inline_query?.from ||
      update.chosen_inline_result?.from;

    if (!from) return;

    const user = await this.store.users.createOrUpdate({
      telegramId: from.id,
      firstName: from.first_name,
      lastName: from.last_name || '',
      langCode: from.language_code || 'en',
      username: from.username || null,
    });

    ctx.from = from;
    ctx.user = user;
  }
}
