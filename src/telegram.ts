import type { Update } from "@grammyjs/types";

import { CallService } from "./call.service";
import { PayloadService } from "./payload";
import type { UpdateHandler, FrameworkConfig } from "./types";
import { ActionsService } from "./actions";
import { ApiService } from "./api.service";
import { type ContextAny, createContext, getContext } from "./context";
import { ContextService } from "./context.service";
import { FormService } from "./form.service";
import { InlineService } from "./inline.service";
import { KeyboardService } from "./keyboard.service";
import { MiddlewaresService } from "./mw";
import { UpdateService } from "./update.service";
import { Logger } from "./logger";
import { LocaleService } from "./locale.service";

export class Telegram {
  private readonly callService: CallService;

  public readonly actions: ActionsService;

  private readonly middlewaresService: MiddlewaresService;

  private readonly updateService: UpdateService;

  public readonly payload: PayloadService;

  public readonly api: ApiService;

  public readonly form: FormService;

  public readonly context: ContextService;

  public readonly inline: InlineService;

  public readonly keyboard: KeyboardService;

  private logger = new Logger(Telegram.name);

  private readonly handler: UpdateHandler;

  private _username: string = "";

  public constructor(frameworkConfig: FrameworkConfig) {
    const { storage, db, tg, locale, actionsTree, handler, textIcons } =
      frameworkConfig;

    this.handler = handler;

    this.callService = new CallService(tg);

    this.actions = new ActionsService(actionsTree, storage);

    this.payload = new PayloadService(this.actions);

    this.api = new ApiService(this.callService);

    const localeService = new LocaleService(locale, textIcons);

    this.context = new ContextService(
      actionsTree,
      this.api,
      localeService,
      this.payload,
    );

    this.form = new FormService(
      this.context,
      this.actions,
      this.payload,
      localeService,
      storage,
    );

    this.inline = new InlineService(this.api, storage);

    this.keyboard = new KeyboardService(this.context, this.payload);

    this.middlewaresService = new MiddlewaresService({
      db,
      storage,
      actionsTree,
      apiService: this.api,
      actionsService: this.actions,
      payloadService: this.payload,
      formService: this.form,
      inlineService: this.inline,
    });

    this.updateService = new UpdateService({
      callService: this.callService,
      handler: (update) => this.updateHandler(update),
    });
  }

  public async init() {
    await this.actions.parse();

    const me = await this.api.getMe({});
    this._username = me.username;

    await this.updateService.startLongpoll();
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

    await this.handler(update);

    if (update.callback_query && !ctx.flags.callbackAnswered) {
      await this.context.answerCallbackQuery();
    }
  }

  public get username(): string {
    return this._username;
  }
}
