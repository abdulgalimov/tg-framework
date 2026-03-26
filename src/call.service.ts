import { ApiMethodType, TelegramConfig, TelegramDebugConfig, ThrottleConfig } from './types';
import { CallApiError, TgErrorCodes } from './errors';
import type { TgLogger, TgLoggerFactory } from './interfaces';

type CallOptions = {
  signal?: AbortSignal | null;
};

type QueuedRequest = {
  method: string;
  body: FormData | object;
  chatId: string | null;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  retryCount: number;
};

type ThrottleState = {
  globalLimit: number;
  perChatInterval: number;
  groupPerMinuteLimit: number;
  exemptMethods: Set<string>;
};

export const DEFAULT_EXEMPT_METHODS: ApiMethodType[] = [
  'answerCallbackQuery',
  'answerInlineQuery',
  'answerPreCheckoutQuery',
  'answerShippingQuery',
  'answerWebAppQuery',
  'getMe',
  'getChat',
  'getFile',
  'getBusinessAccountGifts',
  'getMyDefaultAdministratorRights',
  'getMyCommands',
  'getBusinessConnection',
  'getAvailableGifts',
  'getBusinessAccountStarBalance',
  'getChatGifts',
  'getChatAdministrators',
  'getChatMember',
  'getChatMemberCount',
  'getChatMenuButton',
  'getCustomEmojiStickers',
  'getForumTopicIconStickers',
  'getGameHighScores',
  'getMyDescription',
  'getMyName',
  'getMyShortDescription',
  'getMyStarBalance',
  'getStarTransactions',
  'getStickerSet',
  'getWebhookInfo',
  'getUserChatBoosts',
  'getUserProfilePhotos',
  'getUserProfileAudios',
  'getUserGifts',
  'getUpdates',
];

function extractChatId(body: FormData | object): string | null {
  if (body instanceof FormData) {
    const chatId = body.get('chat_id');
    return chatId ? String(chatId) : null;
  }
  if (typeof body === 'object' && body !== null && 'chat_id' in body) {
    return String((body as Record<string, unknown>).chat_id);
  }
  return null;
}

export class CallService {
  private readonly telegramConfig: TelegramConfig;

  private readonly logger: TgLogger;

  private readonly throttle: ThrottleState;
  private readonly queue: QueuedRequest[] = [];
  private readonly globalTimestamps: number[] = [];
  private readonly chatTimestamps = new Map<string, number[]>();
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  private retryPauseUntil = 0;

  public constructor(
    config: TelegramConfig,
    debug: TelegramDebugConfig,
    loggerFactory: TgLoggerFactory,
  ) {
    this.telegramConfig = config;

    this.logger = loggerFactory.create('TelegramCallService');
    this.logger.setLogLevel(debug.telegramCallServiceLevel);

    const tc = config.throttle;
    this.throttle = {
      globalLimit: tc?.globalLimit ?? 30,
      perChatInterval: tc?.perChatInterval ?? 1000,
      groupPerMinuteLimit: tc?.groupPerMinuteLimit ?? 20,
      exemptMethods: new Set(tc?.exemptMethods ?? DEFAULT_EXEMPT_METHODS),
    };
  }

  public async callApi<T = unknown>(
    method: string,
    body: FormData | object = {},
    callOptions: CallOptions = {},
  ): Promise<T> {
    const { signal } = callOptions || {};

    if (signal || this.throttle.exemptMethods.has(method)) {
      return this.fetchApi<T>(method, body, signal);
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        method,
        body,
        chatId: extractChatId(body),
        resolve: resolve as (value: unknown) => void,
        reject,
        retryCount: 0,
      });
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainTimer !== null) return;
    this.drainTimer = setTimeout(() => this.drain(), 0);
  }

  private scheduleDrainAfter(ms: number): void {
    if (this.drainTimer !== null) return;
    this.drainTimer = setTimeout(() => this.drain(), ms);
  }

  private async drain(): Promise<void> {
    this.drainTimer = null;

    if (this.queue.length === 0) return;

    const now = Date.now();

    if (now < this.retryPauseUntil) {
      this.scheduleDrainAfter(this.retryPauseUntil - now);
      return;
    }

    this.pruneTimestamps(now);

    if (this.globalTimestamps.length >= this.throttle.globalLimit) {
      const waitUntil = this.globalTimestamps[0]! + 1000 - now;
      this.scheduleDrainAfter(Math.max(waitUntil, 10));
      return;
    }

    let sent = false;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i]!;

      if (item.chatId && !this.canSendToChat(item.chatId, now)) {
        continue;
      }

      this.queue.splice(i, 1);

      this.globalTimestamps.push(now);
      if (item.chatId) {
        let timestamps = this.chatTimestamps.get(item.chatId);
        if (!timestamps) {
          timestamps = [];
          this.chatTimestamps.set(item.chatId, timestamps);
        }
        timestamps.push(now);
      }

      sent = true;

      this.fetchApi(item.method, item.body)
        .then(item.resolve)
        .catch((error) => {
          if (
            error instanceof CallApiError &&
            error.code === TgErrorCodes.TOO_MANY_REQUESTS &&
            item.retryCount < 3
          ) {
            const retryAfter = (error.retryAfter ?? 1) * 1000;
            this.logger.warn('Rate limited, retry after', {
              method: item.method,
              retryAfter: error.retryAfter,
              retryCount: item.retryCount,
            });
            item.retryCount++;
            this.queue.unshift(item);
            this.retryPauseUntil = Date.now() + retryAfter;
            this.scheduleDrainAfter(retryAfter);
          } else {
            item.reject(error);
          }
        });

      break;
    }

    if (!sent && this.queue.length > 0) {
      this.scheduleDrainAfter(this.computeNextSlot(now));
    } else if (this.queue.length > 0) {
      this.scheduleDrain();
    }
  }

  private canSendToChat(chatId: string, now: number): boolean {
    const timestamps = this.chatTimestamps.get(chatId);
    if (!timestamps || timestamps.length === 0) return true;

    const lastSend = timestamps[timestamps.length - 1]!;
    if (now - lastSend < this.throttle.perChatInterval) return false;

    if (chatId.startsWith('-')) {
      const oneMinuteAgo = now - 60_000;
      let recentCount = 0;
      for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i]! > oneMinuteAgo) recentCount++;
        else break;
      }
      if (recentCount >= this.throttle.groupPerMinuteLimit) return false;
    }

    return true;
  }

  private computeNextSlot(now: number): number {
    let minWait = this.throttle.perChatInterval;

    for (const item of this.queue) {
      if (!item.chatId) {
        return 10;
      }
      const timestamps = this.chatTimestamps.get(item.chatId);
      if (!timestamps || timestamps.length === 0) return 10;

      const lastSend = timestamps[timestamps.length - 1]!;
      const wait = this.throttle.perChatInterval - (now - lastSend);
      if (wait < minWait) minWait = wait;
    }

    return Math.max(minWait, 10);
  }

  private pruneTimestamps(now: number): void {
    while (this.globalTimestamps.length > 0 && this.globalTimestamps[0]! <= now - 1000) {
      this.globalTimestamps.shift();
    }

    for (const [chatId, timestamps] of this.chatTimestamps) {
      while (timestamps.length > 0 && timestamps[0]! <= now - 60_000) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        this.chatTimestamps.delete(chatId);
      }
    }
  }

  private async fetchApi<T = unknown>(
    method: string,
    body: FormData | object = {},
    signal?: AbortSignal | null,
  ): Promise<T> {
    const url = `${this.telegramConfig.apiUrl}/bot${this.telegramConfig.token}/${method}`;

    const formData = body instanceof FormData ? body : null;

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
          body: JSON.stringify(body),
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
