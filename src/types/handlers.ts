import { ActionItem } from "./actions";
import { UnknownPayload } from "../services/payload";

export type UpdateResult = {
  redirect?: {
    action: ActionItem;
    payload?: UnknownPayload;
  };
} | void;
