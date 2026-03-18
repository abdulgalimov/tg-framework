import type { PayloadSchema } from './types';

export const stringPayloadSchema = <T extends string = string>(): PayloadSchema<T> => {
  return {
    encode: (data, options) => {
      if (typeof data !== 'string') {
        throw new Error(`Key [${options?.key}] must be a string`);
      }

      return data;
    },
    decode: (data, _options) => {
      return data as T;
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
