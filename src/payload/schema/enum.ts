import type { PayloadSchema } from './types';

export const enumPayloadSchema = <T>(values: T[]): PayloadSchema<T> => {
  return {
    parse: (data, options) => {
      if (!values.includes(data as T)) {
        throw new Error(`Key [${options?.key}] must be a string`);
      }
      return data as T;
    },

    optional() {
      return {
        parse: (data, options) => (data === undefined ? undefined : this.parse(data, options)),
        optional: this.optional,
      };
    },
  };
};
