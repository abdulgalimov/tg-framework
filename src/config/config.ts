import { User as TgUser } from "@grammyjs/types";
import { type AllActionsTree, type UpdateHandler, User } from "../types";
import { TextIcons } from "../locale.service";

export type TelegramConfig = {
  apiUrl: string;
  token: string;
};

export type Db = {
  createOrUpdate(from: TgUser): Promise<User>;
};

export type KeyValueStorage = {
  setValue(key: string, value: any): Promise<void>;
  getValue<R = unknown>(key: string): Promise<R | null>;
  del(key: string): Promise<void>;
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
  db: Db;
  storage: KeyValueStorage;
  locale: Locale;
  actionsTree: AllActionsTree;
  handler: UpdateHandler;
  textIcons: TextIcons;
};
