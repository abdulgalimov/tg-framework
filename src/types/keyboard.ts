import type { InferPayloads } from '../payload';
import type { ActionDelete, ActionItemPayload } from './actions';

export type ConfirmContextOptions = {
  action: ActionDelete;
  text: string;
  yesLabel: string;
  noLabel: string;
};

export type PagingOptions = {
  action: ActionItemPayload<{ page?: number | undefined }>;
  currentPage: number;
  totalPages: number;
};

type SwitchButton<Payload> = {
  label: string;
  payload: Payload;
};

export const SwitchButtonMode = {
  Select: 'select',
  Radio: 'radio',
  Custom: 'custom',
} as const;
export type SwitchButtonMode = (typeof SwitchButtonMode)[keyof typeof SwitchButtonMode];

export type SwitchButtonsOptions<
  A extends ActionItemPayload,
  Payload = A extends ActionItemPayload<infer PP> ? PP : never,
  Key extends keyof Payload = keyof Payload,
> = {
  maxOnLine: number;
  buttons: SwitchButton<InferPayloads<A>>[];
  action: A;
  callbackField: Key;
  currentValue: Payload[Key];
  mode?: SwitchButtonMode;
};
