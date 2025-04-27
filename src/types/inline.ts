import type { ActionInline } from './actions';

export type InlineExtraOptions = Record<string, string | number> | undefined;

export type CreateInlineOptions<Extra extends InlineExtraOptions = InlineExtraOptions> = {
  query: string;
  action: ActionInline;
  extra?: Extra | undefined;
};

export type InlineData<Extra extends InlineExtraOptions = InlineExtraOptions> = {
  userId: number;
  query: string;
  actionId: number;
  messageId: number;
  extra: Extra;
};

export type InlineQueryPayload = {
  variables: string;
};

export type InlineChosenPayload = InlineQueryPayload & {
  selectId: string;
};
