import { ActionsMw } from "./actions.mw";
import type { Middleware } from "./types";
import { UserMw } from "./user.mw";
import { Inject, Injectable } from "../di";

@Injectable()
export class MiddlewaresService {
  @Inject(UserMw)
  private readonly userMw!: UserMw;

  @Inject(ActionsMw)
  private readonly actionsMw!: ActionsMw;

  private middlewares: Middleware[] = [];

  public onApplicationStart() {
    this.middlewares = [this.userMw, this.actionsMw];
  }

  public async execute() {
    for (let i = 0; i < this.middlewares.length; i++) {
      await this.middlewares[i]!.execute();
    }
  }
}
