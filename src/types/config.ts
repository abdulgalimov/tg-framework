import { ApiMethodType } from './telegram';

export type ThrottleConfig = {
  globalLimit?: number;
  perChatInterval?: number;
  groupPerMinuteLimit?: number;
  exemptMethods?: ApiMethodType[];
};

export type TelegramConfig = {
  apiUrl: string;
  token: string;
  debug: TelegramDebugConfig;
  throttle?: ThrottleConfig;
};

export type TelegramDebugConfig = {
  payloadDecoderLevel: string;
  telegramCallServiceLevel: string;
  telegramUpdateLevel: string;
};
