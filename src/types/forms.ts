import type { UnknownPayload } from '../payload';
import type { ActionForm } from './actions';

export type CreateFormOptions<Data = unknown> = {
  action: ActionForm;
  defaultData?: Data | null;
};

export type Form<Data = unknown, Payload = UnknownPayload> = {
  lastMessageId?: number;
  userId: bigint;
  actionId: number;
  data: Data | null;
  payload: Payload;
  historyMessages: number[];
};
