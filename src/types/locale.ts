import { HtmlOptions } from '../utils';

export type LocaleData = {
  code: string;
  text: string;
};
export type LocaleServiceOptions = {
  locales: LocaleData[];
  defaultLocale: string;
};

export type LocaleOptions<A> = {
  args?: A;
  html?: HtmlOptions;
};

export type LocaleTypesTemplate = {
  [key: string]: {
    text: string;
    args: object | undefined;
  };
} & {
  'hide-button': {
    text: string;
    args: undefined;
  };
  'cancel-button': {
    text: string;
    args: undefined;
  };
  'back-button': {
    text: string;
    args: undefined;
  };
  'refresh-button': {
    text: string;
    args: undefined;
  };
};
