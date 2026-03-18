import type { TelegramConfig, TelegramDebugConfig } from './config';
import { CallApiError } from './errors';
import type { TgLogger, TgLoggerFactory } from './interfaces';

type CallOptions = {
  signal?: AbortSignal | null;
};

export class CallService {
  private readonly telegramConfig: TelegramConfig;

  private isTesting: boolean = true;

  private readonly logger: TgLogger;

  public constructor(
    config: TelegramConfig,
    debug: TelegramDebugConfig,
    loggerFactory: TgLoggerFactory,
  ) {
    this.telegramConfig = config;

    this.logger = loggerFactory.create('TelegramCallService');
    this.logger.setLogLevel(debug.telegramCallServiceLevel);
  }

  public async callApi<T = unknown>(
    method: string,
    body: FormData | object = {},
    callOptions: CallOptions = {},
  ): Promise<T> {
    const { signal } = callOptions || {};

    const url = `${this.telegramConfig.apiUrl}/bot${this.telegramConfig.token}/${method}`;

    const formData = body instanceof FormData ? (body as FormData) : null;

    this.logger.debug('call', {
      method,
      body: !formData ? body : '[form-data]',
    });

    const options: RequestInit = formData
      ? {
          method: 'POST',
          body: formData,
          signal: signal || null,
        }
      : {
          method: 'POST',
          headers: {
            'Content-type': 'application/json',
          },
          body: JSON.stringify({
            ...body,
            disable_notification: this.isTesting,
          }),
          signal: signal || null,
        };

    return await fetch(url, options)
      .then((res) => res.text())
      .then((responseStr: string) => {
        const response = JSON.parse(responseStr);

        this.logger.debug('response', {
          method,
          response,
        });

        if (response.ok) {
          return response.result;
        } else {
          throw new CallApiError(response, method, body);
        }
      });
  }
}
