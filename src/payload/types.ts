import type { ActionItem, ActionItemPayload } from "../types";
import type { InferPayloads } from "./schema";

export type UnknownPayload = object | undefined;

export type EncodeMethod<
  A extends ActionItem,
  Data = A extends ActionItemPayload ? InferPayloads<A> : never,
> = (action: A, data: Data) => string;
