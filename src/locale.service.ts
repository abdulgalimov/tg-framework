import { HTMLFormat, HtmlOptions, TextBuilder } from './utils';
import { LocaleOptions, LocaleServiceOptions } from './types';
import { ContextService } from './context.service';
import { InitType } from './types/init';

export class LocaleService<T extends InitType> {
  private readonly defaultLocale: string;

  private readonly locales: Record<string, Record<string, string>> = {};

  public constructor(
    private readonly contextService: ContextService<T>,
    private readonly options: LocaleServiceOptions,
  ) {
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

  public build(): TextBuilder<T['locale']> {
    return new TextBuilder<T['locale']>(this);
  }

  private getLangCode() {
    const ctx = this.contextService.get();
    const { user } = ctx;

    const langCode = user.langCode || this.defaultLocale;
    return this.locales[langCode] ? langCode : this.defaultLocale;
  }

  public applyHtml(text: string, options: HtmlOptions) {
    let formattedText = text;
    if (options.code) {
      formattedText = HTMLFormat.code(text);
    }
    if (options.pre) {
      formattedText = HTMLFormat.pre(text);
    }
    if (options.italic) {
      formattedText = HTMLFormat.italic(text);
    }
    if (options.bold) {
      formattedText = HTMLFormat.bold(text);
    }
    if (options.spoiler) {
      formattedText = HTMLFormat.spoiler(text);
    }
    if (options.strike) {
      formattedText = HTMLFormat.strike(text);
    }
    if (options.url) {
      formattedText = HTMLFormat.link(text, options.url);
    }

    if (options.blockquote) {
      formattedText = HTMLFormat.blockquote(text);
    }

    return formattedText;
  }

  public text<Key extends keyof T['locale']>(
    key: Key,
    options?: LocaleOptions<T['locale'][Key]['args']>,
  ): string {
    const langCode = this.getLangCode();
    if (!this.locales[langCode]) {
      throw new Error(`Locale ${langCode} not found`);
    }
    const keyStr = String(key);
    let text = this.locales[langCode][keyStr];
    if (!text) {
      throw new Error(`Key ${keyStr} not found in locale ${langCode}`);
    }

    const args = options?.args;
    if (args) {
      Object.entries(args).forEach(([key, value]) => {
        const argKeyStr = `\$\{${key}\}`;
        text = text.replaceAll(argKeyStr, value);
      });
    }

    if (options?.html) {
      text = this.applyHtml(text, options.html);
    }

    return text;
  }
}
