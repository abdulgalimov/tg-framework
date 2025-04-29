import type { Update } from "@grammyjs/types";

import {
  ActionsService,
  ApiService,
  CallService,
  ContextService,
  FormService,
  InlineService,
  KeyboardService,
  MiddlewaresService,
  PayloadService,
  UpdateService,
} from "./services";
import { LogService, UpdateResult } from "./types";
import { type ContextAny, createContext, getContext } from "./context";
import {
  diContainer,
  ENTRY_SERVICE_EXT,
  Inject,
  Injectable,
  LOGGER_TOKEN,
} from "./di";

@Injectable()
export class Telegram<EntryService> {
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
  private readonly middlewaresService!: MiddlewaresService;

  @Inject(ENTRY_SERVICE_EXT)
  public readonly entryService!: EntryService;

  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: Telegram.name,
    },
  })
  private readonly logger!: LogService;

  private _username: string = "";

  public async init() {
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
    const updateTarget = diContainer.getUpdateTarget();
    let result: UpdateResult;
    if (updateTarget !== null) {
      const { target, key } = updateTarget;

      result = await target[key]();
    } else {
      return;
    }

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
