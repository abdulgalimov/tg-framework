import type { Update } from '@grammyjs/types';

import type { CallService } from './call.service';
import type { TgLogger, TgLoggerFactory } from './interfaces';

type UpdateOptions = {
  callService: CallService;
  handler: (update: Update) => Promise<void>;
  loggerFactory: TgLoggerFactory;
};
export class UpdateService {
  private readonly callService: CallService;
  private readonly handler: (update: Update) => Promise<void>;

  private logger: TgLogger;

  private lastUpdateId: number | undefined;

  private abortController: AbortController | undefined;

  private isRunningLongpoll: boolean = false;

  public constructor(options: UpdateOptions) {
    this.callService = options.callService;
    this.handler = options.handler;
    this.logger = options.loggerFactory.create(UpdateService.name);
  }

  public async execute(update: Update) {
    await this.handler(update).catch((error) => {
      this.logger.error(error);
    });
  }

  public async startLongpoll() {
    this.isRunningLongpoll = true;

    const restart = (timeout: number) => {
      if (!this.isRunningLongpoll) {
        return;
      }

      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.startLongpoll();
      }, timeout);
    };

    let response: Update[];

    this.abortController = new AbortController();

    try {
      response = await this.callService.callApi(
        'getUpdates',
        {
          timeout: 60_000,
          offset: this.lastUpdateId,
        },
        {
          signal: this.abortController.signal,
        },
      );
    } catch (error) {
      this.logger.error(`Fail get update`, error);
      restart(1000);
      return;
    }

    if (response.length) {
      for (let i = 0; i < response.length; i++) {
        await this.execute(response[i]);
      }

      const lastUpdate = response[response.length - 1]!;

      this.lastUpdateId = lastUpdate.update_id + 1;
    }

    restart(300);
  }

  public stopLongpoll() {
    if (!this.isRunningLongpoll) {
      return;
    }
    this.isRunningLongpoll = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
