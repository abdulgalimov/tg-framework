import type { ActionItem } from '../../types';

export type SchemaParseOption = {
  key: string;
};

export type PayloadSchema<
  T,
  Type extends 'object' | 'primitive' = 'primitive',
  Encoded = Type extends Record<string, unknown> ? Record<string, string> : string,
> = {
  encode: (data: unknown, options?: SchemaParseOption) => Encoded | undefined;
  decode: (data: unknown, options?: SchemaParseOption) => T;
  optional: () => PayloadSchema<T | undefined, Type>;
};

export type PayloadSchemaAny = PayloadSchema<unknown>;

export type Infer<T extends PayloadSchemaAny> = T extends PayloadSchema<infer U> ? U : never;

export type BackData = {
  backPayload: string;
  entranceActionId: number;
};

export type BackPayload = {
  back?: BackData | undefined;
};

export type InferPayloads<T extends ActionItem> = T extends {
  '@payloads': PayloadSchema<infer U>;
}
  ? U & BackPayload
  : never;
