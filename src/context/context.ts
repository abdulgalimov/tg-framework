import type { ActionItem } from '../types';
import type { Context, ContextAny } from './types';
import { AsyncLocalStorage } from 'node:async_hooks';

type BaseContext = {} & Record<string, unknown>;
const storage = new AsyncLocalStorage<BaseContext>();

export function createAsyncContext<T extends BaseContext>(
  store: T,
  callback: () => Promise<unknown>,
) {
  return storage.run(store, callback);
}

export function getAsyncContext<T extends BaseContext>(): T {
  return storage.getStore() as T;
}

export async function createContext(
  store: ContextAny,
  callback: (ctx: ContextAny) => Promise<unknown>,
) {
  await createAsyncContext(store, () => callback(store));
}

export function getContext<
  C extends Context<{ action: ActionItem }> = Context<{ action: ActionItem }>,
>() {
  return getAsyncContext<C>();
}
