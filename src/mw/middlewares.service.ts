import type { TgUser } from '../interfaces';
import { ActionsMw } from './actions.mw';
import type { Middleware, MwServiceOptions } from './types';
import { UserMw } from './user.mw';
import { InitType } from '../types/init';

export class MiddlewaresService<T extends InitType> {
  private middlewares: Middleware[];

  public constructor(options: MwServiceOptions<T>) {
    this.middlewares = [new UserMw(options), new ActionsMw(options)];
  }

  public async onApplicationBootstrap() {}

  public async execute() {
    for (let i = 0; i < this.middlewares.length; i++) {
      await this.middlewares[i]!.execute();
    }
  }
}
