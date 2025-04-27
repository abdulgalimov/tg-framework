/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PayloadSchema, PayloadSchemaAny } from './types';

export const objectPayloadSchema = <T extends Record<string, PayloadSchemaAny>>(
  shape: T,
): PayloadSchema<
  {
    [K in keyof T as T[K] extends PayloadSchema<infer U>
      ? undefined extends U
        ? K
        : never
      : never]?: T[K] extends PayloadSchema<infer U> ? U : never;
  } & {
    [K in keyof T as T[K] extends PayloadSchema<infer U>
      ? undefined extends U
        ? never
        : K
      : never]: T[K] extends PayloadSchema<infer U> ? U : never;
  }
> => {
  return {
    parse: (data, options) => {
      if (typeof data !== 'object' || data === null) {
        throw new Error(`Key [${options?.key}] must be a object`);
      }

      const result: any = {};
      for (const key in shape) {
        result[key] = shape[key]!.parse((data as any)[key], {
          key,
        });
      }
      return result;
    },
    optional() {
      return {
        parse: (data, options) => (data === undefined ? undefined : this.parse(data, options)),
        optional: this.optional,
      };
    },
  };
};
