import type { BackPayload } from './schema';

export type UnknownPayload = (object & BackPayload) | undefined;

export type PrepareKeyboard = {
  chatId: number;
  contextId: string;
};
