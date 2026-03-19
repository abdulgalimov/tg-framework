import type { TgUser } from '../interfaces';
import { LocaleTypesTemplate } from './locale';

export type InitType = {
  user: TgUser;
  locale: LocaleTypesTemplate;
};
