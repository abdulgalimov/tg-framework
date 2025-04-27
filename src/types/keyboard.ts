import type { ActionDelete, ActionItemPayload } from './actions';
import type { InferPayloads } from '../payload';

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

export enum SwitchButtonMode {
  Select = 'select',
  Radio = 'radio',
}

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
