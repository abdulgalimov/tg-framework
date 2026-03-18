import { AsyncLocalStorage } from 'node:async_hooks';

import type { Span } from '@opentelemetry/api';

type BaseContext = { span?: Span } & Record<string, unknown>;
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
