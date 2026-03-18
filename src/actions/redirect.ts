import type { BackData, InferPayloads, UnknownPayload } from '../payload';
import type { ActionItem, ActionItemPayload } from '../types';

type Callback = () => Promise<void>;

type RedirectOptions<
  A extends ActionItem,
  Options = A extends ActionItemPayload
    ? {
        action: ActionItem;
        payload: A extends ActionItemPayload ? InferPayloads<A> : never;
        callback?: Callback;
      }
    : {
        action: A;
        callback?: Callback;
      },
> = Options;

export type RedirectResult = {
  action: ActionItem;
  payload?: UnknownPayload | undefined;
  callback?: Callback | undefined;
};

export type GoBack = {
  backData: BackData;
};

export function redirectAction<A extends ActionItem>(options: RedirectOptions<A>): RedirectResult {
  return {
    action: options.action,
    payload: 'payload' in options ? options.payload : undefined,
    callback: options.callback,
  };
}

// biome-ignore lint/suspicious/noConfusingVoidType: void use in function return
export type UpdateResult = void | {
  redirect?: RedirectResult | GoBack;
};
