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
  },
  'object'
> => {
  return {
    encode: (data, options) => {
      if (typeof data !== 'object' || data === null) {
        throw new Error(`Key [${options?.key}] must be a object`);
      }

      // biome-ignore lint/suspicious/noExplicitAny: todo biome
      const result: any = {};
      let key: keyof T;
      for (key in shape) {
        // biome-ignore lint/suspicious/noExplicitAny: todo biome
        result[key] = shape[key]!.encode((data as any)[key], {
          key,
        });
      }

      if (options) {
        return Buffer.from(JSON.stringify(result)).toString('base64');
      }

      return result;
    },
    decode: (data, options) => {
      if (typeof data === 'string') {
        const json = Buffer.from(data as unknown as string, 'base64').toString();
        data = JSON.parse(json);
      }

      if (typeof data !== 'object' || data === null) {
        throw new Error(`Key [${options?.key}] must be a object`);
      }

      // biome-ignore lint/suspicious/noExplicitAny: todo biome
      const result: any = {};
      let key: keyof T;
      for (key in shape) {
        // biome-ignore lint/suspicious/noExplicitAny: todo biome
        result[key] = shape[key]!.decode((data as any)[key], {
          key,
        });
      }
      return result;
    },
    optional() {
      return {
        encode: (data, options) => (data === undefined ? undefined : this.encode(data, options)),
        decode: (data, options) => (data === undefined ? undefined : this.decode(data, options)),
        optional: this.optional,
      };
    },
  };
};
