/* eslint-disable @typescript-eslint/no-explicit-any */

import type { User as TgFrom, Update } from '@grammyjs/types';

import type { TgUser } from '../interfaces';
import type { InferPayloads, UnknownPayload } from '../payload';
import type { ActionItem, ActionItemPayload, Form, InlineData } from '../types';

export type ContextOptions = {
  action?: ActionItem;
  extra?: unknown;
  form?: unknown;
};

export type ContextFlags = {
  callbackAnswered?: boolean;
  messageDeleted?: boolean;
  inlineAnswered?: boolean;
  newMessage?: boolean;
};

export type Context<
  O extends ContextOptions,
  TUser extends TgUser = TgUser,
  E = 'extra' extends keyof O ? Required<O>['extra'] : object | undefined,
  P = O['action'] extends ActionItemPayload ? InferPayloads<O['action']> : UnknownPayload,
  F = 'form' extends keyof O
    ? O['form'] extends object
      ? Form<Required<O>['form']>
      : object | undefined
    : object | undefined,
> = {
  flags: ContextFlags;

  action: ActionItem;
  extra: E;
  payload: P;
  form: F;

  update: Update;
  from: TgFrom;
  user: TUser;
  inline: InlineData;
};

export type ContextAny = Context<{ action: ActionItem }>;

export type UserContextAny<User extends TgUser> = Context<{ action: ActionItem }, User>;
