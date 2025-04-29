import { getContext } from "../context";
import { LocaleServiceExternal, LogService } from "../types";
import { Inject, Injectable, LOCALE_SERVICE_EXT, LOGGER_TOKEN } from "../di";

type Options = {
  args?: Record<string, unknown> | null;
  icon?: string | null;
  leftValue?: string | number | null;
};

@Injectable()
export class LocaleService {
  @Inject(LOCALE_SERVICE_EXT)
  private readonly locale!: LocaleServiceExternal;

  @Inject<LogService>(LOGGER_TOKEN, {
    properties: {
      name: LocaleService.name,
    },
  })
  private readonly logger!: LogService;

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
        icon || this.locale.textIcons[textCode] || (hasLeftValue ? "  " : "");

      return `${hasLeftValue ? leftValue : ""}${splitter}${text}`;
    } catch (error) {
      this.logger.error("Failed to get text", error);

      return `${languageCode}:${textCode}`;
    }
  }
}
