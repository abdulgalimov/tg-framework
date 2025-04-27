import type { Update } from "@grammyjs/types";

import type { CallService } from "./call.service";
import type { TelegramMethod } from "./types";
import { Logger } from "./logger";

type UpdateOptions = {
  callService: CallService;
  handler: (update: Update) => Promise<void>;
};
export class UpdateService {
  private readonly callService: CallService;
  private readonly handler: (update: Update) => Promise<void>;

  private logger = new Logger(UpdateService.name);

  private lastUpdateId: number = 0;

  public constructor(options: UpdateOptions) {
    this.callService = options.callService;
    this.handler = options.handler;
  }

  public async startLongpoll() {
    const restart = (timeout: number) => {
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.startLongpoll();
      }, timeout);
    };

    let response: Update[];

    try {
      response = await this.getUpdates({
        timeout: 60_000,
        offset: this.lastUpdateId,
      });
    } catch (error) {
      this.logger.error(`Fail get update`, error);
      restart(1000);
      return;
    }

    if (response.length) {
      for (let i = 0; i < response.length; i++) {
        await this.handler(response[i]!);
      }

      const lastUpdate = response[response.length - 1]!;

      this.lastUpdateId = lastUpdate.update_id + 1;
    }

    restart(300);
  }

  private getUpdates: TelegramMethod<"getUpdates"> = async (args) => {
    return await this.callService.callApi("getUpdates", args);
  };
}
