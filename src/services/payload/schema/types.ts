/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ActionItemPayload } from "../../../types";

export type SchemaParseOption = {
  key: string;
};

export type PayloadSchema<T> = {
  parse: (data: unknown, options?: SchemaParseOption) => T;
  optional: () => PayloadSchema<T | undefined>;
};

export type PayloadSchemaAny = PayloadSchema<any>;

export type Infer<T extends PayloadSchemaAny> =
  T extends PayloadSchema<infer U> ? U : never;

export type InferPayloads<T extends ActionItemPayload> = T extends {
  "@payloads": PayloadSchema<infer U>;
}
  ? U
  : never;
