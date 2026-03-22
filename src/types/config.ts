export type TelegramConfig = {
  apiUrl: string;
  token: string;
  debug: TelegramDebugConfig;
};

export type TelegramDebugConfig = {
  payloadDecoderLevel: string;
  telegramCallServiceLevel: string;
  telegramUpdateLevel: string;
};
