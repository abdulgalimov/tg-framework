import type { ApiService } from './api.service';
import type { ContextService } from './context.service';
import type { KvStore, TgUser } from './interfaces';
import type { CreateInlineOptions, InlineData, InlineExtraOptions } from './types';

const inlineReg = /^(?<query>\w+)(\s+(?<variables>.+))?/;

const inlineDataTimeout = 15 * 60; // 15 min

export class InlineService<User extends TgUser> {
  private readonly kv: KvStore;

  public constructor(
    private readonly apiService: ApiService,
    private readonly contextService: ContextService<User>,
    kv: KvStore,
  ) {
    this.kv = kv;
  }

  public async create<Extra extends InlineExtraOptions = undefined>(
    options: CreateInlineOptions<Extra>,
  ): Promise<InlineData<Extra>> {
    const ctx = this.contextService.get();
    const { user, payload } = ctx;

    const { query, action, extra, parameter } = options;

    const fullQuery = parameter ? `${query} ${parameter}` : query;

    const inlineData: InlineData<Extra> = {
      userId: user.id,
      query: fullQuery,
      actionId: action.meta.id,
      messageId: 0,
      extra: extra as Extra,
      payload,
      parameter,
    };

    const key = `inline:${user.id}_${query}`;
    await this.kv.setValue(key, inlineData, {
      expireTime: inlineDataTimeout,
    });

    return inlineData;
  }

  public async updateMessageId(inlineData: InlineData, messageId: number): Promise<void> {
    inlineData.messageId = messageId;
    const { userId, query } = inlineData;

    await this.kv.setValue(`inline:${userId}_${query}`, inlineData);
  }

  public async answerInvalid() {
    const ctx = this.contextService.get();

    const inlineQueryId = ctx.update.inline_query?.id;
    if (!inlineQueryId) {
      throw new Error('Invalid inline query');
    }

    await this.apiService.answerInlineQuery({
      inline_query_id: inlineQueryId,
      button: {
        text: 'Unknown command',
        start_parameter: 'empty',
      },
      results: [],
      cache_time: 1,
    });
  }

  public async find(inlineQuery: string): Promise<[InlineData | string, string] | null> {
    const ctx = this.contextService.get();

    const exec = inlineReg.exec(inlineQuery);

    if (!exec?.groups) {
      return null;
    }
    const query = exec.groups.query!;
    const variables = exec.groups.variables || '';

    const { user } = ctx;

    const key = `inline:${user.id}_${query}`;
    const inlineData = await this.kv.getValue<InlineData>(key);
    if (!inlineData) {
      // Return the raw query string for external resolution
      return [query, variables];
    }

    await this.kv.expire(key, inlineDataTimeout);

    return inlineData ? [inlineData, variables] : null;
  }
}
