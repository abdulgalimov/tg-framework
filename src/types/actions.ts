/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PayloadSchema, PayloadSchemaAny } from '../payload';

export type Meta = {
  id: number;
  fullKey: string;
  schemas: PayloadSchemaAny[];
  childOf(action: ActionItem): boolean;
};

export const PayloadsField = '@payloads';

export type ActionItem = {
  meta: Meta;
};

export type ActionItemPayload<S = any> = ActionItem & {
  [PayloadsField]: PayloadSchema<S>;
};

export type ActionItemSelectToken = ActionItemPayload<{ tokenSymbol: string }>;

export type ActionItemCommand = ActionItemPayload<{
  command: string;
  value?: string | undefined;
}>;

export type ActionCore = ActionItem & {
  none: ActionItem;
  hide: ActionItem;
  command: ActionItemCommand;
  text: ActionItem;
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
