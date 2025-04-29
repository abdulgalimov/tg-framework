import type { Update } from "@grammyjs/types";

import {
  UpdateService,
  MiddlewaresService,
  KeyboardService,
  InlineService,
  ContextService,
  ActionsService,
  CallService,
  PayloadService,
  ApiService,
  FormService,
} from "./services";
import { FrameworkConfig, UpdateHandler, UpdateResult } from "./types";
import { type ContextAny, createContext, getContext } from "./context";
import { Logger } from "./logger";
import { CONFIG_KEY, Inject, Injectable } from "./di";

@Injectable()
export class Telegram {
  @Inject(CallService)
  public readonly callService!: CallService;

  @Inject(ActionsService)
  public readonly actions!: ActionsService;

  @Inject(UpdateService)
  private readonly updateService!: UpdateService;

  @Inject(PayloadService)
  public readonly payload!: PayloadService;

  @Inject(ApiService)
  public readonly api!: ApiService;

  @Inject(FormService)
  public readonly form!: FormService;

  @Inject(ContextService)
  public readonly context!: ContextService;

  @Inject(InlineService)
  public readonly inline!: InlineService;

  @Inject(KeyboardService)
  public readonly keyboard!: KeyboardService;

  @Inject(MiddlewaresService)
  private middlewaresService!: MiddlewaresService;

  private logger = new Logger(Telegram.name);

  private readonly handler: UpdateHandler;

  private _username: string = "";

  public constructor(
    @Inject(CONFIG_KEY) private readonly frameworkConfig: FrameworkConfig,
  ) {
    const { handler } = frameworkConfig;

    this.handler = handler;
  }

  public async init() {
    const { storage, actionsTree } = this.frameworkConfig;

    await this.actions.parse();

    this.updateService.setHandler((update) => this.updateHandler(update));

    const me = await this.api.getMe({});
    this._username = me.username;

    this.updateService.startLongpoll().catch(this.logger.error);
  }

  private async updateHandler(update: Update) {
    try {
      const store = {
        update,
        flags: {},
      };
      await createContext(store as ContextAny, () =>
        this.updateWithContext(update),
      );
    } catch (error) {
      this.logger.error("Update handler", error);
    }
  }

  private async updateWithContext(update: Update) {
    const ctx = getContext();

    await this.middlewaresService.execute();

    await this.tryHandler(ctx, 1);

    if (update.callback_query && !ctx.flags.callbackAnswered) {
      await this.context.answerCallbackQuery();
    }
  }

  private async tryHandler(
    ctx: ContextAny,
    tryCount: number,
  ): Promise<UpdateResult> {
    const result = await this.handler();

    if (typeof result === "object" && result.redirect) {
      const { action, payload } = result.redirect;
      ctx.action = action;

      ctx.payload = this.payload.parse(ctx.action, ctx.payload, payload);

      if (tryCount < 5) {
        await this.tryHandler(ctx, tryCount + 1);
      }
    }
  }

  public get username(): string {
    return this._username;
  }
}
