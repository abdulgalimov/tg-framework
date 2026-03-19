import { HtmlOptions } from './utils';

export type LocaleData = {
  code: string;
  text: string;
};
export type LocaleServiceOptions = {
  locales: LocaleData[];
  defaultLocale: string;
};

type LocaleOptions<A> = {
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

export class LocaleService<Types extends LocaleTypesTemplate> {
  private readonly defaultLocale: string;

  private readonly locales: Record<string, Record<string, string>> = {};

  public constructor(private readonly options: LocaleServiceOptions) {
    const { locales, defaultLocale } = options;

    this.defaultLocale = defaultLocale;

    this.locales = {};
    locales.forEach((locale) => {
      const { code, text } = locale;

      this.locales[code] = {};

      text.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        this.locales[code][key.trim()] = value.trim();
      });
    });
  }

  public text<Key extends keyof Types>(key: Key, args?: LocaleOptions<Types[Key]['args']>) {
    return key;
  }
}
