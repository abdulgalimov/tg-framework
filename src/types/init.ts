import type { TgUser } from '../interfaces';
import { LocaleTypesTemplate } from '../locale.service';

export type InitType = {
  user: TgUser;
  locale: LocaleTypesTemplate;
};
