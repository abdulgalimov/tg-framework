import { ApiService } from "./api.service";
import { getContext } from "./context";
import type {
  CreateInlineOptions,
  InlineData,
  InlineExtraOptions,
  DataStorage,
  FrameworkConfig,
} from "./types";
import { CONFIG_KEY, Inject, Injectable } from "./di";

const inlineReg = /^(?<query>\w+)(\s+(?<variables>.+))?/;

@Injectable()
export class InlineService {
  @Inject(ApiService)
  private readonly apiService!: ApiService;

  private readonly storage: DataStorage;

  public constructor(@Inject(CONFIG_KEY) frameworkConfig: FrameworkConfig) {
    this.storage = frameworkConfig.storage;
  }

  public async create<Extra extends InlineExtraOptions = undefined>(
    options: CreateInlineOptions<Extra>,
  ): Promise<InlineData> {
    const ctx = getContext();
    const { user } = ctx;

    const { query, action, extra } = options;

    const inlineData: InlineData<Extra> = {
      userId: user.telegramId,
      query,
      actionId: action.meta.id,
      messageId: 0,
      extra: extra as Extra,
    };

    await this.storage.setValue(
      `inline_${user.telegramId}_${query}`,
      inlineData,
    );

    return inlineData;
  }

  public async updateMessageId(
    inlineData: InlineData,
    messageId: number,
  ): Promise<void> {
    inlineData.messageId = messageId;
    const { userId, query } = inlineData;

    await this.storage.setValue(`inline_${userId}_${query}`, inlineData);
  }

  public async answerInvalid() {
    const ctx = getContext();

    const inlineQueryId = ctx.update.inline_query?.id;
    if (!inlineQueryId) {
      throw new Error("Invalid inline query");
    }

    await this.apiService.answerInlineQuery({
      inline_query_id: inlineQueryId,
      button: {
        text: "Unknown command",
        start_parameter: "empty",
      },
      results: [],
      cache_time: 1,
    });
  }

  public async find(inlineQuery: string): Promise<[InlineData, string] | null> {
    const ctx = getContext();

    const exec = inlineReg.exec(inlineQuery);

    if (!exec?.groups) {
      await this.answerInvalid();
      return null;
    }
    const query = exec.groups.query!;
    const variables = exec.groups.variables || "";

    const { user } = ctx;

    const inlineData = await this.storage.getValue<InlineData>(
      `inline_${user.telegramId}_${query}`,
    );
    if (!inlineData) {
      await this.answerInvalid();
      return null;
    }

    return inlineData ? [inlineData, variables] : null;
  }
}
