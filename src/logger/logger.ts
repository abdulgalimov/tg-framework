import * as console from "node:console";

export class Logger {
  public constructor(private readonly name: string) {}

  public debug(...args: unknown[]) {
    console.log(...args);
  }

  public info(...args: unknown[]) {
    console.info(...args);
  }

  public warn(...args: unknown[]) {
    console.warn(...args);
  }

  public error(...args: unknown[]) {
    console.error(...args);
  }
}
