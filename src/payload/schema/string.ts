import type { PayloadSchema } from './types';

export const stringPayloadSchema = (): PayloadSchema<string> => {
  return {
    parse: (data, options) => {
      if (typeof data !== 'string') {
        throw new Error(`Key [${options?.key}] must be a string`);
      }
      return data;
    },

    optional() {
      return {
        parse: (data, options) => (data === undefined ? undefined : this.parse(data, options)),
        optional: this.optional,
      };
    },
  };
};
