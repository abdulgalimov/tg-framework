
import type { ActionItem } from './types';

// Logger
export interface TgLogger {
  error(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
  setLogLevel(level: number): void;
}

export interface TgLoggerFactory {
  create(name: string): TgLogger;
}

// Locale
export interface TgLocale {
  text(code: string): string;
}

// User
export interface TgUser {
  id: bigint;
  telegramId: number;
  langCode: string | null;
}

// Store
export interface ActionsStore {
  createAll(pathList: string[]): Promise<{ path: string; id: number }[]>;
}

export interface KeyboardPayloadsStore {
  create(data: { payload: string; chatId: number; contextId: string }): Promise<string>;
  find(id: string): Promise<string | null>;
  deleteMessages(chatId: number, messageId: number | number[]): Promise<void>;
  updateMessageId(contextId: string, messageId: number): Promise<void>;
  deleteContext(contextId: string): Promise<void>;
}

export interface UsersStore<TUser> {
  createOrUpdate(data: {
    telegramId: number;
    firstName: string;
    lastName: string;
    langCode: string;
    username: string | null;
  }): Promise<TUser>;
}

export interface TelegramStore<TUser extends TgUser = TgUser> {
  actions: ActionsStore;
  keyboardPayloads: KeyboardPayloadsStore;
  users: UsersStore<TUser>;
}

// KvStore
export interface KvStore {
  getValue<V>(key: string): Promise<V | null>;
  setValue<V>(key: string, value: V, options?: { expireTime?: number }): Promise<void>;
  removeValue(key: string): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
}

// InlineQueryResolver
export interface InlineQueryResolver {
  resolveQuery(query: string): { action: ActionItem; payload?: Record<string, unknown> } | null;
  resolveChosen(query: string): { action: ActionItem; payload?: Record<string, unknown> } | null;
}
