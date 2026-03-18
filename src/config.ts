export type TelegramConfig = {
  apiUrl: string;
  token: string;
  debug: TelegramDebugConfig;
};

export type TelegramDebugConfig = {
  payloadDecoderLevel: number;
  telegramCallServiceLevel: number;
  telegramUpdateLevel: number;
};
