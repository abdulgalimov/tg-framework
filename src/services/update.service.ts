import type { Update } from "@grammyjs/types";

import { CallService } from "./call.service";
import type { LogService, TelegramMethod } from "../types";
import { Inject, Injectable, LOGGER_TOKEN } from "../di";

@Injectable()
export class UpdateService {
  @Inject(CallService)
  private readonly callService!: CallService;

  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: UpdateService.name,
    },
  })
  private readonly logger!: LogService;

  private handler?: (update: Update) => Promise<void>;

  private lastUpdateId: number = 0;

  public setHandler(handler: (update: Update) => Promise<void>) {
    this.handler = handler;
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
        if (this.handler) {
          await this.handler(response[i]!);
        }
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
