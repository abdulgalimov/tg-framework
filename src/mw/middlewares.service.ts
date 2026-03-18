import type { TgUser } from '../interfaces';
import { ActionsMw } from './actions.mw';
import type { Middleware, MwServiceOptions } from './types';
import { UserMw } from './user.mw';

export class MiddlewaresService<User extends TgUser> {
  private middlewares: Middleware[];

  public constructor(options: MwServiceOptions<User>) {
    this.middlewares = [new UserMw(options), new ActionsMw(options)];
  }

  public async onApplicationBootstrap() {}

  public async execute() {
    for (let i = 0; i < this.middlewares.length; i++) {
      await this.middlewares[i]!.execute();
    }
  }
}
