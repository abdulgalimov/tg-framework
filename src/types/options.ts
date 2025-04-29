import { User as TgUser } from "@grammyjs/types";
import { type AllActionsTree, LogService, User } from "./index";

export type TextIcons = Record<string, string>;

export type TelegramConfig = {
  apiUrl: string;
  token: string;
};

export type StorageServiceExternal = {
  setValue(key: string, value: any): Promise<void>;
  getValue<R = unknown>(key: string): Promise<R | null>;
  delValue(key: string): Promise<void>;
  createUser(from: TgUser): Promise<User>;
};

export type LocaleServiceExternal = {
  text(
    languageCode: string,
    textCode: string,
    args?: Record<string, unknown>,
  ): string;

  textIcons: TextIcons;
};

export type FrameworkOptions = {
  config: TelegramConfig;
  actionsTree: AllActionsTree;
};

export type FrameworkServices<EntryService> = {
  entryService: { new (): EntryService };
  storageService: { new (): StorageServiceExternal };
  localeService: { new (): LocaleServiceExternal };
  logService?: { new (): LogService };
};
