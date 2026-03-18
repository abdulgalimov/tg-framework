import type { UnknownPayload } from '../payload';
import type { ActionInline } from './actions';

export type InlineExtraOptions = Record<string, string | number> | undefined;

export type CreateInlineOptions<Extra extends InlineExtraOptions = InlineExtraOptions> = {
  query: string;
  action: ActionInline;
  extra?: Extra | undefined;
  parameter?: string;
};

export type InlineData<Extra extends InlineExtraOptions = InlineExtraOptions> = {
  userId: bigint;
  query: string;
  actionId: number;
  messageId: number;
  extra: Extra;
  parameter?: string | undefined;
  payload?: UnknownPayload;
};

export type InlineQueryPayload = {
  query: string;
  variables: string;
  offset: string;
};

export type InlineChosenPayload = {
  query: string;
  variables: string;
  selectId: string;
};
