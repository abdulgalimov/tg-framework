/* eslint-disable @typescript-eslint/unified-signatures */

import { randomBytes, randomUUID } from 'node:crypto';

import type { ActionsService } from '../actions';
import type { InitType, TelegramDebugConfig } from '../types';
import type { Context } from '../context';
import type { InlineKeyboardsStore, TgLoggerFactory } from '../interfaces';
import {
  ActionItem,
  ActionItemPayload,
  EditMessageTextArgs,
  SendMessageArgs,
  SendPhotoArgs,
} from '../types';
import type { InferPayloads } from './schema';
import { ShortsPayload } from './shorts';
import type { PrepareKeyboard, UnknownPayload } from './types';
import { ContextService } from '../context';
import { InfoService } from '../info.service';

const DbPrefix = 'db_';
const LongPrefix = 'long_';
const Base64Prefix = 'b64_';

const forceEncodeSymbols = ['%', '.'];

export class PayloadService<T extends InitType> {
  private readonly logger;

  private readonly currentVersion: string = 'v1';

  private readonly shortsPayload = new ShortsPayload();

  public constructor(
    private readonly info: InfoService,
    private readonly contextService: ContextService<T>,
    private readonly actionsService: ActionsService<T>,
    private readonly keyboardPayloads: InlineKeyboardsStore,
    debugConfig: TelegramDebugConfig,
    loggerFactory: TgLoggerFactory,
  ) {
    this.logger = loggerFactory.create(PayloadService.name);
    this.logger.setLogLevel(debugConfig.payloadDecoderLevel);
  }

  public configureShorts(keys: Record<string, string>, values: Record<string, string>) {
    this.shortsPayload.configure(keys, values);
  }

  private collectPayloads(payloads: (UnknownPayload | undefined)[]): UnknownPayload {
    return payloads
      .filter((payload) => !!payload)
      .reduce(
        (accOut: Record<string, unknown>, payload) => {
          Object.entries(payload).forEach(([key, value]) => {
            if (value === undefined) {
              return;
            }
            accOut[key] = value;
          });
          return accOut;
        },
        {} as Record<string, unknown>,
      );
  }

  private encodePayload(
    action: ActionItem,
    ...payloads: UnknownPayload[]
  ): Record<string, string> | undefined {
    const collectable = payloads.length > 1 ? this.collectPayloads(payloads) : payloads[0];
    if (!collectable) return;

    return action.meta.schemas.reduce(
      (accOut, schema) => {
        const parsed = schema.encode(collectable);

        if (parsed === undefined) {
          return accOut;
        }

        Object.entries(parsed).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }

          accOut[key] = value;
        });

        return accOut;
      },
      {} as Record<string, string>,
    );
  }

  public decodePayload(action: ActionItem, ...payloads: UnknownPayload[]): UnknownPayload {
    const collectable = payloads.length > 1 ? this.collectPayloads(payloads) : payloads[0];
    if (!collectable) return;

    const decoded = action.meta.schemas.reduce(
      (accOut, schema) => {
        const parsed = schema.decode(collectable);

        if (!parsed) {
          return accOut;
        }

        Object.entries(parsed).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }

          accOut[key] = value;
        });

        return accOut;
      },
      {} as Record<string, unknown>,
    );

    this.logger.debug('decode', {
      action: action.meta.fullKey,
      decoded,
    });

    return decoded;
  }

  public encode<A extends ActionItem>(action: A, data?: InferPayloads<A>): string {
    const ctx = this.contextService.get<Context<{ action: ActionItemPayload }, T['user']>>();

    // remove newMessage from ctx payload
    const { _newMessage, ...otherCtxPayload } = ctx.payload || {};

    const parsedPayload = this.encodePayload(action, otherCtxPayload, data);

    const fields = parsedPayload
      ? Object.entries(parsedPayload).flatMap(([k, v]) => {
          const shortKey: string = this.shortsPayload.shortKeys[k] || k;
          const shortValue: string = this.shortsPayload.shortValues[v] || v;

          return [shortKey, shortValue];
        })
      : [];

    const salt = randomBytes(4).toString('hex');

    const payload = [this.currentVersion, salt, action.meta.id, ...fields].join('_');

    return payload.length > 64 ? `${LongPrefix}(${payload})` : payload;
  }

  public encodeUrl<A extends ActionItemPayload>(action: A, data: InferPayloads<A>): string;
  public encodeUrl<A extends ActionItem>(action: A): string;
  public encodeUrl<A extends ActionItem>(action: A, data?: UnknownPayload): string {
    const ctx = this.contextService.get();

    let messageId = 0;
    if (ctx?.update?.callback_query?.message) {
      messageId = ctx.update.callback_query.message.message_id;
    }

    const payload = {
      ...data,
      messageId,
    };

    let encoded = payload
      ? this.encode(action as unknown as ActionItemPayload, payload)
      : this.encode(action);

    if (!encoded.startsWith(LongPrefix) && forceEncodeSymbols.some((s) => encoded.includes(s))) {
      const base64 = Buffer.from(encoded).toString('base64');
      const encodedB64 = `${Base64Prefix}${base64}`;
      encoded = encodedB64.length < 64 ? encodedB64 : `${LongPrefix}${encoded}`;
    }

    return `https://t.me/${this.info.username}?start=${encoded}`;
  }

  public async decode(sourceIn: string): Promise<[ActionItem, UnknownPayload]> {
    let source: string = '';
    if (sourceIn.startsWith(DbPrefix)) {
      const id = sourceIn.slice(DbPrefix.length);
      const dbPayload = await this.keyboardPayloads.find(id);
      if (!dbPayload) {
        throw new Error('Payload not found in db');
      }
      source = dbPayload;
    } else if (sourceIn.startsWith(Base64Prefix)) {
      source = Buffer.from(sourceIn.slice(Base64Prefix.length), 'base64').toString();
    } else {
      source = sourceIn;
    }

    const [version, _salt, actionStr, ...values] = source.split('_');
    if (version !== this.currentVersion) {
      throw new Error('Invalid payload version');
    }

    if (!actionStr || !+actionStr) {
      throw new Error('Invalid payload action');
    }

    const actionId = parseInt(actionStr, 10);
    const action = this.actionsService.getById(actionId);

    const payload: Record<string, unknown> = {};
    for (let i = 0; i < values.length; i += 2) {
      const k = values[i]!;
      const v = values[i + 1]!;
      if (!k || !v) {
        this.logger.warn('Invalid key in decode values');
        continue;
      }

      const fullKey = this.shortsPayload.fullKeys[k] || k;
      payload[fullKey] = this.shortsPayload.fullValues[v] || v;
    }

    const parsedPayload = this.decodePayload(action, payload);

    return [action, parsedPayload];
  }

  public async prepareSend(
    args: SendMessageArgs | EditMessageTextArgs | SendPhotoArgs,
    chatId: number,
  ): Promise<PrepareKeyboard | null> {
    const contextId = randomUUID();

    let encodedText = 'text' in args ? args.text : args.caption || '';

    const replaceText = async (count: number = 0) => {
      if (count > 100) {
        this.logger.error('Too many long payloads in text', {
          count,
          encodedText,
        });
        return;
      }

      const longPayloadReg = /long_\((?<payload>[^)]+)\)/;

      const exec = longPayloadReg.exec(encodedText);
      if (!exec) {
        return;
      }

      const [source, payload] = exec;

      const id = await this.keyboardPayloads.create({
        payload: payload!,
        chatId,
        contextId,
      });

      encodedText = encodedText.replaceAll(source, `${DbPrefix}${id}`);

      if (encodedText.includes(LongPrefix)) {
        await replaceText(count + 1);
      }
    };

    if (encodedText.includes(LongPrefix)) {
      await replaceText();

      if ('text' in args) {
        args.text = encodedText;
      } else {
        args.caption = encodedText;
      }
    }

    if (args.reply_markup) {
      const inlineKeyboard =
        'inline_keyboard' in args.reply_markup ? args.reply_markup.inline_keyboard : [];

      await Promise.all(
        inlineKeyboard.flatMap((line) =>
          line.map(async (button) => {
            if (!('callback_data' in button) || !button.callback_data) {
              return null;
            }

            const callbackData = button.callback_data;
            if (!callbackData.startsWith(LongPrefix)) {
              return null;
            }

            const payload = callbackData.slice(LongPrefix.length + 1, -1);

            const id = await this.keyboardPayloads.create({
              payload,
              chatId,
              contextId,
            });
            button.callback_data = `${DbPrefix}${id}`;

            return id;
          }),
        ),
      );
    }

    return {
      contextId,
      chatId,
    };
  }

  /**
   *  При создании клавиатуры в prepareSend мы создаем в базе keyboardPayloads без messageId,
   *  После успешной отправки, удаляем из базы все записи у которых есть messageId (старые клавы)
   *  После этого записываем новый messageId во все кнопки с текущим contextId
   */
  public async completeSend(prepareKeyboard: PrepareKeyboard | null, messageId: number) {
    if (!prepareKeyboard) {
      return;
    }
    const { contextId, chatId } = prepareKeyboard;
    await this.keyboardPayloads.deleteMessages(chatId, messageId);
    await this.keyboardPayloads.updateMessageId(contextId, messageId);
  }

  public async revertSend(prepareKeyboard: PrepareKeyboard | null) {
    if (!prepareKeyboard) {
      return;
    }
    const { contextId } = prepareKeyboard;

    await this.keyboardPayloads.deleteContext(contextId);
  }

  public async deleteKeyboard(chatId: number, messageId: number | number[]) {
    await this.keyboardPayloads.deleteMessages(chatId, messageId);
  }
}
