import type { PayloadSchema } from './types';

export const enumPayloadSchema = <T extends string | number>(
  values: T[],
  type: 'string' | 'number' = 'string',
): PayloadSchema<T> => {
  return {
    encode: (data, options) => {
      if (!values.includes(data as T)) {
        throw new Error(`Key [${options?.key}] must be a enum`);
      }
      return `${data}`;
    },
    decode: (data, options) => {
      const value = type === 'string' ? data : parseFloat(`${data}`);
      if (!values.includes(value as T)) {
        throw new Error(`Key [${options?.key}] must be a enum`);
      }
      return value as T;
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
