import type { ActionForm } from "./actions";
import type { UnknownPayload } from "../services";

export type CreateFormOptions = {
  action: ActionForm;
};

export type Form<Data = object> = {
  lastMessageId?: number;
  userId: number;
  actionId: number;
  data: Data;
  payload: UnknownPayload;
  historyMessages: number[];
};
