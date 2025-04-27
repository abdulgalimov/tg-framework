import { getContext } from "./context";
import { Logger } from "./logger";
import { Locale } from "./config";

export type TextIcons = Record<string, string>;

type Options = {
  args?: Record<string, unknown> | null;
  icon?: string | null;
  leftValue?: string | number | null;
};

export class LocaleService {
  private readonly i18n: Locale;

  private readonly textIcons: TextIcons;

  private readonly logger: Logger;

  public constructor(i18n: Locale, textIcons: TextIcons) {
    this.i18n = i18n;
    this.textIcons = textIcons;
    this.logger = new Logger(LocaleService.name);
  }

  public text(textCode: string, options?: Options): string {
    const { user } = getContext();

    const { args, icon, leftValue } = options || {};

    const languageCode = user.langCode || "en";
    try {
      const text = args
        ? this.i18n.text(languageCode, textCode, args)
        : this.i18n.text(languageCode, textCode);

      const hasLeftValue = leftValue !== null && leftValue !== undefined;

      const splitter =
        icon || this.textIcons[textCode] || (hasLeftValue ? "  " : "");

      return `${hasLeftValue ? leftValue : ""}${splitter}${text}`;
    } catch (error) {
      this.logger.error("Failed to get text", error);

      return `${languageCode}:${textCode}`;
    }
  }
}
