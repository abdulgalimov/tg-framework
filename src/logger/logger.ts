import * as console from "node:console";
import { LogService } from "../types";

export class Logger implements LogService {
  public name: string = "";

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
