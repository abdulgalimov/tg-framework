/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PayloadSchema } from '../payload';

declare const __actionPath: unique symbol;

export type Meta = {
  id: number;
  fullKey: string;
  fullPath: string[];
  schemas: PayloadSchema<object>[];
  childOf(action: ActionItem): boolean;
  parent: ActionItem | null;
};

export const PayloadsField = '@payloads';

export type ActionItem<Path extends string = string> = {
  meta: Meta;
  readonly [__actionPath]: Path;
};

// biome-ignore lint/suspicious/noExplicitAny: need any payload
export type ActionItemPayload<S = any, Path extends string = string> = ActionItem<Path> & {
  [PayloadsField]: PayloadSchema<S>;
};

export type ActionItemCommand<Path extends string = string> = ActionItemPayload<
  {
    command: string;
    value?: string | undefined;
  },
  Path
>;

export type ActionCore = ActionItem<'core'> & {
  none: ActionItem<'core.none'>;
  hide: ActionItem<'core.hide'>;
  command: ActionItemCommand<'core.command'>;
  text: ActionItem<'core.text'>;
  inline: ActionInline<'core.inline'>;
  viaBot: ActionItem<'core.viaBot'>;
};

export type AllActionsTree = ActionItem<''> & {
  core: ActionCore;
};

type JoinPath<Prefix extends string, Key extends string> = Prefix extends ''
  ? Key
  : `${Prefix}.${Key}`;

type Mapped<T, Prefix extends string = ''> = {
  [K in keyof T & string]: TreeNode<T[K], JoinPath<Prefix, K>>;
};

type MaybeSchema<A, Path extends string = string> = A extends {
  [PayloadsField]: PayloadSchema<infer A>;
}
  ? A & ActionItem<Path> & { [PayloadsField]: PayloadSchema<A> }
  : A & ActionItem<Path>;

export type TreeNode<T, Path extends string = string> = MaybeSchema<T, Path> & Mapped<T, Path>;

export type ActionForm<Path extends string = string> = ActionItem<Path> & {
  progress: ActionItem<`${Path}.progress`>;
  cancel?: ActionItem<`${Path}.cancel`>;
};

export type ActionInlinePayload = {
  query: string;
};
export type ActionInline<Path extends string = string> = ActionItemPayload<
  ActionInlinePayload,
  Path
> & {
  select: ActionItemPayload<ActionInlinePayload, `${Path}.select`>;
};

export type ActionDelete<Path extends string = string> = ActionItem<Path> & {
  confirm: ActionItem<`${Path}.confirm`>;
  reject: ActionItem<`${Path}.reject`>;
};
