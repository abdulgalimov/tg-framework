import type { Update } from '@grammyjs/types';

import type { CallService } from './call.service';
import type { TgLogger, TgLoggerFactory } from './interfaces';
import { setTimeout as sleep } from 'timers/promises';

type UpdateOptions = {
  callService: CallService;
  handler: (update: Update) => Promise<void>;
  loggerFactory: TgLoggerFactory;
};
export class UpdateService {
  private readonly callService: CallService;
  private readonly handler: (update: Update) => Promise<void>;

  private logger: TgLogger;

  private abortController: AbortController | undefined;

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

  private updateQueue: Update[] = [];

  private pollingStarted: boolean = false;

  public async startLongpoll() {
    this.pollingStarted = true;

    let offset: number = 0;

    let backoffMs = 500;

    this.logger.debug('pollForever');

    while (this.pollingStarted) {
      try {
        this.abortController = new AbortController();

        this.logger.debug('getUpdates call');
        const updates = await this.callService.callApi<Update[]>(
          'getUpdates',
          offset
            ? {
                timeout: 60,
                offset,
              }
            : {
                timeout: 60,
              },
          {
            signal: this.abortController.signal,
          },
        );

        this.logger.debug('getUpdates response', {
          updates: updates.length,
          updateQueue: this.updateQueue.length,
        });

        if (updates.length) {
          const lastId = updates[updates.length - 1]!.update_id;
          offset = lastId + 1;

          this.updateQueue.push(...updates);
          void this.runWorker();
        }

        backoffMs = 500;
      } catch (error) {
        const tgError = error as { code: number; message: string };
        if (tgError?.code === 409) {
          this.logger.error(
            '409 Conflict: another getUpdates is running. Make sure only ONE instance is polling.',
          );
          await sleep(5000);
        } else {
          this.logger.error('poll error', error);
          await sleep(backoffMs);
          backoffMs = Math.min(backoffMs * 2, 15_000);
        }
      }
    }
  }

  private workerRunning: boolean = false;
  private async runWorker() {
    if (this.workerRunning) return;
    this.workerRunning = true;
    try {
      while (this.updateQueue.length) {
        const update = this.updateQueue.shift()!;
        this.logger.debug(`runWorker start: ${update.update_id}`);
        await this.execute(update);
        this.logger.debug(`runWorker complete: ${update.update_id}`);
      }
    } finally {
      this.workerRunning = false;
    }
  }

  public stopLongpoll() {
    if (!this.pollingStarted) {
      return;
    }
    this.pollingStarted = false;
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
