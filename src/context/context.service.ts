import { InitType } from '../types/init';
import { type ContextAny, UserContextAny } from './index';
import { AsyncLocalStorage } from 'node:async_hooks';

type BaseContext = {} & Record<string, unknown>;

export type InternalContext = {
  deleteMessages: Record<number, number[]>;
};

export class ContextService<T extends InitType> {
  private readonly storageRequest: AsyncLocalStorage<BaseContext>;
  private readonly storageInternal: AsyncLocalStorage<InternalContext>;

  public constructor() {
    this.storageRequest = new AsyncLocalStorage<BaseContext>();

    this.storageInternal = new AsyncLocalStorage<InternalContext>();
  }

  public async createRequest(store: ContextAny, callback: (ctx: ContextAny) => Promise<unknown>) {
    await this.storageRequest.run(store, () => callback(store));
  }

  public async createInternal(callback: () => Promise<unknown>) {
    const store: InternalContext = {
      deleteMessages: {},
    };
    await this.storageInternal.run(store, () => callback());
  }

  public async getInternal() {
    return this.storageInternal.getStore() as InternalContext;
  }

  public get<C extends UserContextAny<T['user']> = UserContextAny<T['user']>>() {
    return this.storageRequest.getStore() as C;
  }
}
