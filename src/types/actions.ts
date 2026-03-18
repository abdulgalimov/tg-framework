/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PayloadSchema } from '../payload';

export type Meta = {
  id: number;
  fullKey: string;
  schemas: PayloadSchema<object>[];
  childOf(action: ActionItem): boolean;
  parent: ActionItem | null;
};

export const PayloadsField = '@payloads';

export type ActionItem = {
  meta: Meta;
};

// biome-ignore lint/suspicious/noExplicitAny: need any payload
export type ActionItemPayload<S = any> = ActionItem & {
  [PayloadsField]: PayloadSchema<S>;
};

export type ActionItemCommand = ActionItemPayload<{
  command: string;
  value?: string | undefined;
}>;

export type ActionCore = ActionItem & {
  none: ActionItem;
  hide: ActionItem;
  command: ActionItemCommand;
  text: ActionItem;
  inline: ActionInline;
  viaBot: ActionItem;
};

export type AllActionsTree = ActionItem & {
  core: ActionCore;
};

type Mapped<T> = {
  [Property in keyof T]: TreeNode<T[Property]>;
};

type MaybeSchema<A> = A extends {
  [PayloadsField]: PayloadSchema<infer A>;
}
  ? A & ActionItem & { [PayloadsField]: PayloadSchema<A> }
  : A & ActionItem;

export type TreeNode<T> = MaybeSchema<T> & Mapped<T>;

export type ActionForm = ActionItem & {
  progress: ActionItem;
  cancel?: ActionItem;
};

export type ActionInline = ActionItem & {
  select: ActionItem;
};

export type ActionDelete = ActionItem & {
  confirm: ActionItem;
  reject: ActionItem;
};
