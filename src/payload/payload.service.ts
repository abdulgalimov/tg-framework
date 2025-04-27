/* eslint-disable @typescript-eslint/unified-signatures */

import { ActionsService } from "../actions";
import { type Context, getContext } from "../context";
import {
  ActionItem,
  ActionItemPayload,
  ActionItemWithoutPayload,
} from "../types";
import type { InferPayloads } from "./schema";
import { fullKeys, fullValues, shortKeys, shortValues } from "./shorts";
import type { UnknownPayload } from "./types";
import { Logger } from "../logger";

const CurrenVersion = "v1";

export class PayloadService {
  private readonly logger = new Logger(PayloadService.name);

  public constructor(private readonly actionsService: ActionsService) {}

  public parse(
    action: ActionItem,
    ...payloads: UnknownPayload[]
  ): UnknownPayload {
    const collectable =
      payloads.length > 1 ? this.collectPayloads(payloads) : payloads[0];
    if (!collectable) return;

    return action.meta.schemas.reduce((accOut, schema) => {
      const parsed = schema.parse(collectable) as UnknownPayload;

      if (!parsed) {
        return accOut;
      }

      const filtered = Object.entries(parsed).reduce((accIn, [key, value]) => {
        if (value === undefined || value === null) {
          return accIn;
        }

        return {
          ...accIn,
          [key]: value,
        };
      }, {});

      return {
        ...accOut,
        ...filtered,
      };
    }, {});
  }

  private collectPayloads(
    payloads: (UnknownPayload | undefined)[],
  ): UnknownPayload {
    return payloads
      .filter((payload) => !!payload)
      .reduce((accOut, payload) => {
        return {
          ...accOut,
          ...Object.entries(payload).reduce((accIn, [key, value]) => {
            if (value === undefined) {
              return accIn;
            }
            return {
              ...accIn,
              [key]: value,
            };
          }, {}),
        };
      }, {});
  }

  public encode<A extends ActionItemPayload>(
    action: A,
    data: InferPayloads<A>,
  ): string;
  public encode(action: ActionItemWithoutPayload): string;
  public encode(
    action: ActionItem | ActionItemPayload,
    data?: UnknownPayload,
  ): string {
    const ctx = getContext<Context<{ action: ActionItemPayload }>>();

    const parsedPayload = this.parse(action, ctx.payload, data);

    const fields = parsedPayload
      ? Object.entries(parsedPayload)
          .map(([k, v]) => {
            const shortKey = shortKeys[k] || k;
            const shortValue = shortValues[v] || v;

            return `${shortKey}=${shortValue}`;
          })
          .join(":")
      : "";

    const end = fields ? `:${fields}` : "";

    return `${CurrenVersion}:${action.meta.id}${end}`;
  }

  public decode(source: string): [ActionItem, UnknownPayload] {
    const [version, actionStr, ...values] = source.split(":");
    if (version !== CurrenVersion) {
      throw new Error("Invalid payload version");
    }

    if (!actionStr || !+actionStr) {
      throw new Error("Invalid payload action");
    }

    const actionId = parseInt(actionStr);
    const action = this.actionsService.getById(actionId);

    const payload = values
      ? values.reduce((acc, kv) => {
          const [k, v] = kv.split("=");

          if (!k || !v) {
            this.logger.warn("Invalid key in decode values");
            return acc;
          }

          const fullKey = fullKeys[k] || k;
          const fullValue = fullValues[v] || v;

          return {
            ...acc,
            [fullKey]: fullValue,
          };
        }, {})
      : {};

    const parsedPayload = this.parse(action, payload);

    return [action, parsedPayload];
  }
}
