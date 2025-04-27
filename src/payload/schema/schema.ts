import { bigintPayloadSchema } from './bigint';
import { enumPayloadSchema } from './enum';
import { numberPayloadSchema } from './number';
import { objectPayloadSchema } from './object';
import { stringPayloadSchema } from './string';

export const payloadSchema = {
  object: objectPayloadSchema,
  string: stringPayloadSchema,
  number: numberPayloadSchema,
  bigint: bigintPayloadSchema,
  enum: enumPayloadSchema,
};
