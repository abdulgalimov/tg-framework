import type { Middleware } from "./types";
import { Logger } from "../../logger";
import { Inject, LOGGER_TOKEN } from "../../di";
import { LogService, OnApplicationStart } from "../../types";

export abstract class BaseMw implements Middleware, OnApplicationStart {
  @Inject(LOGGER_TOKEN)
  protected logger!: LogService;

  protected constructor(private readonly name: string) {}

  public onApplicationStart(): void {
    this.logger.name = this.name;
  }

  abstract execute(): Promise<void>;
}
