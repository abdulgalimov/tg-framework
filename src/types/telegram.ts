/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stream } from 'stream';

import type { Update } from '@grammyjs/types';
import type { Message } from '@grammyjs/types/message';
import type { ApiMethods } from '@grammyjs/types/methods';

export type SendFile = {
  stream: Stream;
  filename: string;
  contentType: string;
};

export type TelegramMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends (args: infer Args) => infer Return
    ? (args: Args) => Promise<Return>
    : never;

export type GetArgsFromMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends (args: infer Args) => any ? Args : never;

export type UpdateHandler = (update: Update) => Promise<void>;

export type EditMessageTextArgs = GetArgsFromMethod<'editMessageText'>;

export type EditMessageTextResult = Message.TextMessage;

export type SendMessageArgs = GetArgsFromMethod<'sendMessage'>;

export type SendMessageResult = Message.TextMessage;

export type AnswerCallbackQueryArgs = GetArgsFromMethod<'answerCallbackQuery'>;

export type AnswerInlineQueryArgs = GetArgsFromMethod<'answerInlineQuery'>;

export type SendDocumentArgs = GetArgsFromMethod<'sendDocument'>;

export type SendPhotoArgs = GetArgsFromMethod<'sendPhoto'>;
