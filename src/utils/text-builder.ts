import { HTMLFormat, HtmlOptions } from './html-format';
import { LocaleOptions, LocaleTypesTemplate } from '../types';

type LocaleService<Types extends LocaleTypesTemplate> = {
  text<Key extends keyof Types>(key: Key, args?: LocaleOptions<Types[Key]['args']>): string;
  applyHtml(text: string, options: HtmlOptions): string;
};

export class TextBuilder<Types extends LocaleTypesTemplate> {
  private readonly lines: string[] = [];

  public constructor(
    private readonly localeService: LocaleService<Types>,
    private readonly htmlOptions?: HtmlOptions,
    private readonly parent?: TextBuilder<Types>,
  ) {}

  public addSection(): TextBuilder<Types> {
    return this.addText('————————————');
  }

  public addLocale<Key extends keyof Types>(
    textCode: Key,
    options?: LocaleOptions<Types[Key]['args']>,
  ): TextBuilder<Types> {
    this.lines.push(this.localeService.text(textCode, options));

    return this;
  }

  public appendLocale<Key extends keyof Types>(
    textCode: Key,
    options?: LocaleOptions<Types[Key]['args']>,
  ): TextBuilder<Types> {
    return this.appendText(this.localeService.text(textCode, options));
  }

  public addText(text: string, options?: HtmlOptions): TextBuilder<Types> {
    this.lines.push(options ? this.localeService.applyHtml(text, options) : text);
    return this;
  }

  public valueSplitter() {
    return this.appendText(': ');
  }

  public appendText(text: string, options?: HtmlOptions): TextBuilder<Types> {
    if (!text) {
      return this;
    }

    const formattedText = options ? this.localeService.applyHtml(text, options) : text;

    const lastLine = this.lines[this.lines.length - 1];
    if (lastLine === undefined) {
      this.lines.push(formattedText);
      return this;
    }

    this.lines[this.lines.length - 1] = `${lastLine}${formattedText}`;
    return this;
  }

  public appendButton(text: string, url: string): TextBuilder<Types> {
    return this.appendText(HTMLFormat.link(text, url));
  }

  public break() {
    this.lines.push('');
    return this;
  }

  public addBuilder(options?: HtmlOptions) {
    return new TextBuilder(this.localeService, options, this);
  }

  public complete() {
    if (!this.parent) {
      throw new Error('Unable to complete locale builder');
    }

    this.parent.addText(this.toString());
  }

  public toString(): string {
    const text = this.lines.join('\n');
    return this.htmlOptions ? this.localeService.applyHtml(text, this.htmlOptions) : text;
  }
}
