import { getContext } from "../context";
import { Logger } from "../logger";
import { FrameworkConfig, Locale, TextIcons } from "../types";
import { CONFIG_KEY, Inject, Injectable } from "../di";

type Options = {
  args?: Record<string, unknown> | null;
  icon?: string | null;
  leftValue?: string | number | null;
};

@Injectable()
export class LocaleService {
  private readonly locale: Locale;

  private readonly textIcons: TextIcons;

  private readonly logger: Logger;

  public constructor(@Inject(CONFIG_KEY) frameworkConfig: FrameworkConfig) {
    this.locale = frameworkConfig.locale;
    this.textIcons = frameworkConfig.textIcons || {};
    this.logger = new Logger(LocaleService.name);
  }

  public text(textCode: string, options?: Options): string {
    const { user } = getContext();

    const { args, icon, leftValue } = options || {};

    const languageCode = user.langCode || "en";
    try {
      const text = args
        ? this.locale.text(languageCode, textCode, args)
        : this.locale.text(languageCode, textCode);

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
