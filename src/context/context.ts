import { AsyncLocalStorage } from "node:async_hooks";

import type { Context, ContextAny } from "./types";
import type { ActionItem } from "../types";

export type AsyncLocalStorageContextStore<T extends Record<string, unknown>> =
  T;

const context = new AsyncLocalStorage<Record<string, unknown>>();

export async function createContext<T extends ContextAny>(
  store: AsyncLocalStorageContextStore<T>,
  callback: () => Promise<void>,
) {
  await context.run(store, callback);
}

export function getContext<
  C extends Context<{ action: ActionItem }> = Context<{ action: ActionItem }>,
>() {
  return context.getStore() as AsyncLocalStorageContextStore<C> & {
    spanId: string;
  };
}
