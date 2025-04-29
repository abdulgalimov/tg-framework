/* eslint-disable @typescript-eslint/no-explicit-any */
import { Stream } from "stream";
import type { Message } from "@grammyjs/types/message";
import type { ApiMethods } from "@grammyjs/types/methods";

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
  ApiMethods<SendFile>[MethodName] extends (args: infer Args) => any
    ? Args
    : never;

export const supportedMethods = [
  "getUpdates",
  "sendMessage",
  "forwardMessage",
  "forwardMessages",
  "copyMessage",
  "copyMessages",
  "sendPhoto",
  "sendAudio",
  "sendDocument",
  "sendVideo",
  "sendAnimation",
  "sendVoice",
  "sendVideoNote",
  "sendPaidMedia",
  "sendMediaGroup",
  "sendLocation",
  "sendVenue",
  "sendContact",
  "sendPoll",
  "sendDice",
  "sendChatAction",
  "setMessageReaction",
  "getUserProfilePhotos",
  "setUserEmojiStatus",
  "getFile",
  "banChatMember",
  "unbanChatMember",
  "restrictChatMember",
  "promoteChatMember",
  "setChatAdministratorCustomTitle",
  "banChatSenderChat",
  "unbanChatSenderChat",
  "setChatPermissions",
  "exportChatInviteLink",
  "createChatInviteLink",
  "editChatInviteLink",
  "createChatSubscriptionInviteLink",
  "editChatSubscriptionInviteLink",
  "revokeChatInviteLink",
  "approveChatJoinRequest",
  "declineChatJoinRequest",
  "setChatPhoto",
  "deleteChatPhoto",
  "setChatTitle",
  "setChatDescription",
  "pinChatMessage",
  "unpinChatMessage",
  "unpinAllChatMessages",
  "leaveChat",
  "getChat",
  "getChatAdministrators",
  "getChatMemberCount",
  "getChatMember",
  "setChatStickerSet",
  "deleteChatStickerSet",
  "getForumTopicIconStickers",
  "createForumTopic",
  "editForumTopic",
  "closeForumTopic",
  "reopenForumTopic",
  "deleteForumTopic",
  "unpinAllForumTopicMessages",
  "editGeneralForumTopic",
  "closeGeneralForumTopic",
  "reopenGeneralForumTopic",
  "hideGeneralForumTopic",
  "unhideGeneralForumTopic",
  "unpinAllGeneralForumTopicMessages",
  "answerCallbackQuery",
  "getUserChatBoosts",
  "getBusinessConnection",
  "setMyCommands",
  "deleteMyCommands",
  "getMyCommands",
  "setMyName",
  "getMyName",
  "setMyDescription",
  "getMyDescription",
  "setMyShortDescription",
  "getMyShortDescription",
  "setChatMenuButton",
  "getChatMenuButton",
  "setMyDefaultAdministratorRights",
  "getMyDefaultAdministratorRights",
  "editMessageText",
  "editMessageCaption",
  "editMessageMedia",
  "editMessageLiveLocation",
  "stopMessageLiveLocation",
  "editMessageReplyMarkup",
  "stopPoll",
  "deleteMessage",
  "deleteMessages",
  "getAvailableGifts",
  "giftPremiumSubscription",
  "verifyUser",
  "verifyChat",
  "removeUserVerification",
  "removeChatVerification",
  "readBusinessMessage",
  "deleteBusinessMessages",
  "setBusinessAccountName",
  "setBusinessAccountUsername",
  "setBusinessAccountBio",
  "setBusinessAccountProfilePhoto",
  "removeBusinessAccountProfilePhoto",
  "setBusinessAccountGiftSettings",
  "getBusinessAccountStarBalance",
  "transferBusinessAccountStars",
  "getBusinessAccountGifts",
  "convertGiftToStars",
  "upgradeGift",
  "transferGift",
  "postStory",
  "editStory",
  "deleteStory",
  "answerInlineQuery",
  "answerWebAppQuery",
  "savePreparedInlineMessage",
  "getMe",
  "sendInvoice",
  "createInvoiceLink",
  "answerShippingQuery",
  "answerPreCheckoutQuery",
  "getStarTransactions",
  "refundStarPayment",
  "editUserStarSubscription",
  "setPassportDataErrors",
  "sendGame",
  "setGameScore",
  "getGameHighScores",
] as const;
export type SupportedMethods = (typeof supportedMethods)[number];

export const methodsWithFile = {
  sendDocument: "document",
  sendPhoto: "photo",
  sendAudio: "audio",
  sendVideo: "video",
  sendAnimation: "animation",
  sendVoice: "voice",
  sendVideoNote: "video_note",
} as const;

export type MethodsWithFile = "sendDocument" | "sendPhoto"; //keyof typeof methodsWithFile;

export type Methods = {
  [MethodName in SupportedMethods]: TelegramMethod<MethodName>;
};

export type EditMessageTextArgs = GetArgsFromMethod<"editMessageText">;

export type EditMessageTextResult = Message.TextMessage;

export type SendMessageArgs = GetArgsFromMethod<"sendMessage">;

export type SendMessageResult = Message.TextMessage;

export type AnswerCallbackQueryArgs = GetArgsFromMethod<"answerCallbackQuery">;

export type AnswerInlineQueryArgs = GetArgsFromMethod<"answerInlineQuery">;
