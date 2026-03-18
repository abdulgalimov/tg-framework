import type { Update } from '@grammyjs/types';
import type {
  ForceReply,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from '@grammyjs/types/markup';
import type { Message } from '@grammyjs/types/message';
import type { ApiMethods } from '@grammyjs/types/methods';

export type SendFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export const QzarButtonStyles = {
  Refresh: 'refresh',
  Back: 'back',
};
export type QzarButtonStyles = (typeof QzarButtonStyles)[keyof typeof QzarButtonStyles];

export type CustomInlineButton = InlineKeyboardButton & {
  qzarStyle?: QzarButtonStyles | undefined;
};

type HasReplyMarkup = {
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
};

type UseCustomKeyboard<T> = T extends HasReplyMarkup
  ? Omit<T, 'reply_markup'> & { reply_markup?: { inline_keyboard: CustomInlineButton[][] } }
  : T;

export type TelegramMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends (args: infer Args) => infer Return
    ? (args: UseCustomKeyboard<Args>) => Promise<Return>
    : never;

export type GetArgsFromMethod<MethodName extends keyof ApiMethods<SendFile>> =
  ApiMethods<SendFile>[MethodName] extends (args: infer Args) => unknown
    ? UseCustomKeyboard<Args>
    : never;

export type UpdateHandler = (update: Update) => Promise<void>;

export type EditMessageTextArgs = GetArgsFromMethod<'editMessageText'>;

export type EditMessageTextResult = Message.TextMessage;

export type SendMessageArgs = GetArgsFromMethod<'sendMessage'>;

export type SendMessageResult = Message.TextMessage;

export type AnswerCallbackQueryArgs = GetArgsFromMethod<'answerCallbackQuery'>;

export type AnswerInlineQueryArgs = GetArgsFromMethod<'answerInlineQuery'>;

export type SendDocumentArgs = GetArgsFromMethod<'sendDocument'>;

export type SendPhotoArgs = GetArgsFromMethod<'sendPhoto'>;
