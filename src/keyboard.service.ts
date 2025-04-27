import type { InlineKeyboardButton } from "@grammyjs/types/markup";

import { ContextService } from "./context.service";
import { PayloadService } from "./payload";
import {
  type ActionItemPayload,
  type ConfirmContextOptions,
  type PagingOptions,
  SwitchButtonMode,
  type SwitchButtonsOptions,
} from "./types";
import { Icons } from "./types/icons";

export class KeyboardService {
  public readonly maxButtons: number = 7;

  public constructor(
    private readonly contextService: ContextService,
    private readonly payloadService: PayloadService,
  ) {}

  public async confirmMenu(options: ConfirmContextOptions) {
    const { action, text, yesLabel, noLabel } = options;
    await this.contextService.reply({
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: yesLabel,
              callback_data: this.payloadService.encode(action.confirm),
            },
            {
              text: noLabel,
              callback_data: this.payloadService.encode(action.reject),
            },
          ],
        ],
      },
    });
  }

  public pagingButtons(options: PagingOptions): InlineKeyboardButton[] {
    const maxButtons = this.maxButtons;
    const shift = Math.floor(maxButtons / 2);

    const { action, totalPages, currentPage } = options;

    let start = 1;
    let end = totalPages;

    if (totalPages > maxButtons) {
      start = Math.max(1, currentPage - shift);
      if (start === 1) {
        end = maxButtons;
      } else {
        end = Math.min(totalPages, start + maxButtons - 1);
        if (end === totalPages) {
          start = totalPages - maxButtons + 1;
        }
      }
    }

    const buttons: InlineKeyboardButton[] = [];

    const startText = start > 1 ? Icons.PrevButton : "1";
    const endText = end < totalPages ? Icons.NextButton : `${totalPages}`;

    for (let i = start; i <= end; i++) {
      let text = `${i}`;
      if (i === start) {
        text = startText;
      } else if (i === end) {
        text = endText;
      }

      if (i === currentPage) {
        text = `${Icons.Current}`;
      }

      buttons.push({
        text,
        callback_data: this.payloadService.encode(action, {
          page: i,
        }),
      });
    }

    return buttons;
  }

  public switchButtons<A extends ActionItemPayload>(
    options: SwitchButtonsOptions<A>,
  ): InlineKeyboardButton[][] {
    const { mode, maxOnLine, buttons, action, currentValue, callbackField } =
      options;

    const inlineButtons = buttons.map((button) => {
      const isCurrent = currentValue === button.payload[callbackField];
      let icon = "";
      switch (mode) {
        case SwitchButtonMode.Radio:
          icon = isCurrent ? Icons.RadioButtonOn : Icons.RadioButtonOff;
          break;
        case SwitchButtonMode.Select:
        default:
          icon = isCurrent ? Icons.Current : "";
          break;
      }
      return {
        text: `${icon}${button.label}`,
        callback_data: this.payloadService.encode(action, button.payload),
      };
    });

    if (inlineButtons.length <= maxOnLine) {
      return [inlineButtons];
    }

    if (inlineButtons.length > maxOnLine) {
      if (inlineButtons.length <= maxOnLine * 2) {
        const half = Math.ceil(maxOnLine / 2);
        return [
          inlineButtons.slice(0, half + 1),
          inlineButtons.slice(half + 1),
        ];
      }
    }

    const sortedButtons: InlineKeyboardButton[][] = [];

    while (inlineButtons.length > 0) {
      sortedButtons.push(inlineButtons.splice(0, maxOnLine));
    }

    return sortedButtons;
  }
}
