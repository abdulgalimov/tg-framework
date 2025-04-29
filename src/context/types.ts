/* eslint-disable @typescript-eslint/no-explicit-any */

import type { User as TgFrom, Update } from "@grammyjs/types";

import type { InferPayloads, UnknownPayload } from "../services/payload";
import type {
  ActionItem,
  ActionItemPayload,
  Form,
  InlineData,
  User,
} from "../types";

export type ContextOptions = {
  action?: ActionItem;
  extra?: unknown;
  form?: any;
};

export type Context<
  O extends ContextOptions,
  E = "extra" extends keyof O ? Required<O>["extra"] : object | undefined,
  P = O["action"] extends ActionItemPayload
    ? InferPayloads<O["action"]>
    : UnknownPayload,
  F = "form" extends keyof O
    ? O["form"] extends object
      ? Form<Required<O>["form"]>
      : object | undefined
    : object | undefined,
> = {
  flags: {
    callbackAnswered?: boolean;
    messageDeleted?: boolean;
    inlineAnswered?: boolean;
  };

  action: ActionItem;
  extra: E;
  payload: P;
  form: F;

  update: Update;
  from: TgFrom;
  user: User;
  inline: InlineData;
};

export type ContextAny = Context<{ action: ActionItem }>;
