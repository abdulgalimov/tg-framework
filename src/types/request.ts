import type {
  AnswerCallbackQueryArgs,
  AnswerInlineQueryArgs,
  EditMessageTextResult,
  SendMessageArgs,
  SendMessageResult,
} from './telegram';
import type {
  ForceReply,
  InlineKeyboardMarkup,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from '@grammyjs/types/markup';
import { ReplyKeyboardPayload } from './keyboard';

export type AnswerCallbackQueryContext = Omit<AnswerCallbackQueryArgs, 'callback_query_id'>;

export type ReplyArgsContext = Omit<SendMessageArgs, 'chat_id' | 'reply_markup'> & {
  reply_markup?:
    | InlineKeyboardMarkup
    | ReplyKeyboardMarkup
    | ReplyKeyboardRemove
    | ForceReply
    | ReplyKeyboardPayload;
};

export type ReplyResultContext = SendMessageResult | EditMessageTextResult;

export type AnswerInlineQueryContext = Omit<AnswerInlineQueryArgs, 'inline_query_id'>;

export type ReplyOptions = {
  sendMode?: boolean | undefined;
  tryReplyMessage?: boolean | undefined;
  messageId?: number | undefined | null;
  noUpdateLastMessage?: boolean | undefined;
};
