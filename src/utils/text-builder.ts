import { HTMLFormat } from './html-format';

export type HtmlOptions = {
  bold?: boolean | null;
  italic?: boolean | null;
  code?: boolean | null;
  pre?: boolean | null;
  url?: string | null;
};

export class TextBuilder {
  private readonly lines: string[] = [];

  public constructor(
    private readonly htmlOptions?: HtmlOptions,
    private readonly parent?: TextBuilder,
  ) {}

  private htmlFormat(text: string, html: HtmlOptions) {
    let formattedText: string = text;
    if (html.bold) {
      formattedText = HTMLFormat.bold(formattedText);
    }
    if (html.italic) {
      formattedText = HTMLFormat.italic(formattedText);
    }
    if (html.code) {
      formattedText = HTMLFormat.code(formattedText);
    }
    if (html.pre) {
      formattedText = HTMLFormat.pre(formattedText);
    }
    if (html.url) {
      formattedText = HTMLFormat.link(formattedText, html.url);
    }
    return formattedText;
  }

  public addSection(): TextBuilder {
    return this.addText('————————————');
  }

  public addText(text: string, options?: HtmlOptions): TextBuilder {
    this.lines.push(options ? this.htmlFormat(text, options) : text);
    return this;
  }

  public valueSplitter() {
    return this.appendText(': ');
  }

  public appendText(text: string, options?: HtmlOptions): TextBuilder {
    if (!text) {
      return this;
    }

    const formattedText = options ? this.htmlFormat(text, options) : text;

    const lastLine = this.lines[this.lines.length - 1];
    if (lastLine === undefined) {
      this.lines.push(formattedText);
      return this;
    }

    this.lines[this.lines.length - 1] = `${lastLine}${formattedText}`;
    return this;
  }

  public appendButton(text: string, url: string): TextBuilder {
    return this.appendText(HTMLFormat.link(text, url));
  }

  public break() {
    this.lines.push('');
    return this;
  }

  public addBuilder(options?: HtmlOptions) {
    return new TextBuilder(options, this);
  }

  public complete() {
    if (!this.parent) {
      throw new Error('Unable to complete locale builder');
    }

    this.parent.addText(this.toString());
  }

  public toString(): string {
    const text = this.lines.join('\n');
    return this.htmlOptions ? this.htmlFormat(text, this.htmlOptions) : text;
  }
}
