import type { PayloadSchema } from './types';

export const bigintPayloadSchema = (): PayloadSchema<bigint> => {
  return {
    encode: (data, options) => {
      if (typeof data !== 'bigint') {
        throw new Error(`Key [${options?.key}] must be a bigint`);
      }

      return data.toString();
    },
    decode: (data, options) => {
      let num: bigint;

      try {
        num = BigInt(data as string);
      } catch (_error) {
        throw new Error(`Key [${options?.key}] must be a bigint`);
      }

      return num;
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
