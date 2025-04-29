import {
  ActionItem,
  ActionItemPayload,
  ActionItemWithoutPayload,
  UpdateResult,
} from "../../types";
import { InferPayloads, UnknownPayload } from "../payload";

export function redirect<A extends ActionItemPayload>(
  action: A,
  payload: InferPayloads<A>,
): UpdateResult;
export function redirect(action: ActionItemWithoutPayload): UpdateResult;
export function redirect(
  action: ActionItem | ActionItemPayload,
  payload?: any,
): UpdateResult {
  return {
    redirect: {
      action,
      payload,
    },
  };
}
