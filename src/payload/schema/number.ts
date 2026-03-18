import type { PayloadSchema } from './types';

export const numberPayloadSchema = <T extends number = number>(): PayloadSchema<T> => {
  return {
    encode: (data, options) => {
      if (typeof data !== 'number') {
        throw new Error(`Key [${options?.key}] must be a number`);
      }

      return `${data}`;
    },
    decode: (data, options) => {
      const num = parseFloat(data as string);

      if (Number.isNaN(num)) {
        throw new Error(`Key [${options?.key}] must be a number`);
      }

      return num as T;
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
