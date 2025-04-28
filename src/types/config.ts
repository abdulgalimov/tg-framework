import { User as TgUser } from "@grammyjs/types";
import { type AllActionsTree, type UpdateHandler, User } from "./index";

export type TextIcons = Record<string, string>;

export type TelegramConfig = {
  apiUrl: string;
  token: string;
};

export type DataStorage = {
  setValue(key: string, value: any): Promise<void>;
  getValue<R = unknown>(key: string): Promise<R | null>;
  delValue(key: string): Promise<void>;
  createUser(from: TgUser): Promise<User>;
};

export type Locale = {
  text(
    languageCode: string,
    textCode: string,
    args?: Record<string, unknown>,
  ): string;
};

export type FrameworkConfig = {
  tg: TelegramConfig;
  storage: DataStorage;
  locale: Locale;
  actionsTree: AllActionsTree;
  handler: UpdateHandler;
  textIcons?: TextIcons;
};
