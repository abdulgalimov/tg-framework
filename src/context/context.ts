import { createAsyncContext, getAsyncContext } from '../async-context';
import type { ActionItem } from '../types';
import type { Context, ContextAny } from './types';

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
