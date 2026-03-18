import type { PayloadSchema } from './types';

export const booleanPayloadSchema = (): PayloadSchema<boolean> => {
  return {
    encode: (data) => {
      return data ? '11' : '00';
    },
    decode: (data) => {
      return data === '11';
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
