import FormData from "form-data";

import { CallApiError } from "./errors";
import { TelegramConfig } from "./types";

export class CallService {
  private readonly telegramConfig: TelegramConfig;

  private isTesting: boolean = true;

  public constructor(config: TelegramConfig) {
    this.telegramConfig = config;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async callApi<T = any>(
    method: string,
    body: FormData | object = {},
  ): Promise<T> {
    const url = `${this.telegramConfig.apiUrl}/bot${this.telegramConfig.token}/${method}`;

    const formData = body instanceof FormData ? (body as FormData) : null;

    const options = {
      method: "POST",
      headers: formData
        ? formData.getHeaders()
        : {
            "Content-type": "application/json",
          },
      body: formData
        ? formData
        : JSON.stringify({
            ...body,
            disable_notification: this.isTesting,
          }),
    };

    try {
      const result = await fetch(url, options)
        .then((res) => res.text())
        .then((responseStr: string) => {
          const response = JSON.parse(responseStr);

          if (response.ok) {
            return response.result;
          } else {
            throw new CallApiError(response, method, body);
          }
        });
      return result;
    } catch (err) {
      if (err instanceof CallApiError) {
        throw err;
      }

      throw err;
    }
  }
}
