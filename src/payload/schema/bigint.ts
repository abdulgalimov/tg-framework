/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PayloadSchema } from './types';

export const bigintPayloadSchema = (): PayloadSchema<bigint> => {
  return {
    parse: (data, options) => {
      let num: bigint;

      try {
        num = BigInt(data as string);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error: any) {
        throw new Error(`Key [${options?.key}] must be a bigint`);
      }

      return num;
    },
    optional() {
      return {
        parse: (data, options) => (data === undefined ? undefined : this.parse(data, options)),
        optional: this.optional,
      };
    },
  };
};
