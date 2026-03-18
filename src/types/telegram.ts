import type { Message, ApiMethods, Update } from '@grammyjs/types';

export type SendFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export type GetArgsFromMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends () => unknown
    ? null
    : ApiMethods<SendFile>[MethodName] extends (args: infer Args) => unknown
      ? Args
      : never;

export type GetReturnFromMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends (args: any) => infer Return ? Return : never;

export type UpdateHandler = (update: Update) => Promise<void>;

export type EditMessageTextArgs = GetArgsFromMethod<'editMessageText'>;

export type EditMessageTextResult = Message.TextMessage;

export type SendMessageArgs = GetArgsFromMethod<'sendMessage'>;

export type SendMessageResult = Message.TextMessage;

export type AnswerCallbackQueryArgs = GetArgsFromMethod<'answerCallbackQuery'>;

export type AnswerInlineQueryArgs = GetArgsFromMethod<'answerInlineQuery'>;

export type SendDocumentArgs = GetArgsFromMethod<'sendDocument'>;

export type SendPhotoArgs = GetArgsFromMethod<'sendPhoto'>;
