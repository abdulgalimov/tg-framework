import type { PayloadSchema } from './types';

export const numberPayloadSchema = (): PayloadSchema<number> => {
  return {
    parse: (data, options) => {
      const num = parseFloat(data as string);

      if (isNaN(num)) {
        throw new Error(`Key [${options?.key}] must be a number`);
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
