import { ActionItem } from "./actions";
import { UnknownPayload } from "../payload";

export type UpdateResult = {
  redirect?: {
    action: ActionItem;
    payload?: UnknownPayload;
  };
} | void;
