export type TelegramConfig = {
  apiUrl: string;
  token: string;
};

export type TelegramDebugConfig = {
  payloadDecoderLevel: number;
  telegramCallServiceLevel: number;
  telegramUpdateLevel: number;
};
