import type { Middleware } from "./types";
import { Logger } from "../../logger";

export abstract class BaseMw implements Middleware {
  protected logger: Logger;

  protected constructor(name: string) {
    this.logger = new Logger(name);
  }

  abstract execute(): Promise<void>;
}
