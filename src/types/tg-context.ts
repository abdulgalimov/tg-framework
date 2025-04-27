import type {
  AnswerCallbackQueryArgs,
  AnswerInlineQueryArgs,
  EditMessageTextResult,
  SendMessageArgs,
  SendMessageResult,
} from './telegram';

export type AnswerCallbackQueryContext = Omit<AnswerCallbackQueryArgs, 'callback_query_id'>;

export type ReplyArgsContext = Omit<SendMessageArgs, 'chat_id'>;

export type ReplyResultContext = SendMessageResult | EditMessageTextResult;

export type AnswerInlineQueryContext = Omit<AnswerInlineQueryArgs, 'inline_query_id'>;

export type KeyboardArgs = Pick<ReplyArgsContext, 'reply_markup'>;

export type ReplyOptions = {
  sendMode?: boolean | undefined;
  tryReplyMessage?: boolean | undefined;
  hideButton?: boolean | undefined;
};
