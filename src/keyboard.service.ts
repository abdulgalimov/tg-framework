/* eslint-disable @typescript-eslint/unified-signatures */

import type { InlineKeyboardButton } from '@grammyjs/types/markup';

import type { ContextService } from './context.service';
import type { TgLocale, TgUser } from './interfaces';
import type { BackData, InferPayloads, PayloadService } from './payload';
import {
  type ActionItem,
  type ActionItemPayload,
  type ConfirmContextOptions,
  type CustomInlineButton,
  type PagingOptions,
  QzarButtonStyles,
  SwitchButtonMode,
  type SwitchButtonsOptions,
} from './types';

type BackButtonOptionsExt<A extends ActionItem> = {
  labelKey?: string;
  actionItem: A;
  actionData?: InferPayloads<A>;
};

type BackButtonOptions<A extends ActionItem> =
  | {
      actionItem: A;
      actionData?: InferPayloads<A>;
    }
  | {
      callbackData: string;
    };

type RefreshButtonOptions<A extends ActionItem> =
  | {
      actionItem: A;
      actionData?: InferPayloads<A>;
    }
  | {
      callbackData?: string;
    };

type PagingIcons = {
  PrevButton: string;
  NextButton: string;
  Current: string;
};

type SwitchIcons = {
  RadioButtonOn: string;
  RadioButtonOff: string;
  Current: string;
};

export class KeyboardService<User extends TgUser> {
  public readonly maxButtons: number = 7;

  private pagingIcons: PagingIcons = { PrevButton: '<<', NextButton: '>>', Current: '.' };
  private switchIcons: SwitchIcons = { RadioButtonOn: '(x)', RadioButtonOff: '( )', Current: '.' };

  public constructor(
    protected readonly contextService: ContextService<User>,
    protected readonly payloadService: PayloadService<User>,
    protected readonly locale: TgLocale,
  ) {}

  public setIcons(pagingIcons: PagingIcons, switchIcons: SwitchIcons) {
    this.pagingIcons = pagingIcons;
    this.switchIcons = switchIcons;
  }

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

    const startText = start > 1 ? this.pagingIcons.PrevButton : '1';
    const endText = end < totalPages ? this.pagingIcons.NextButton : `${totalPages}`;

    for (let i = start; i <= end; i++) {
      let text = `${i}`;
      if (i === start) {
        text = startText;
      } else if (i === end) {
        text = endText;
      }

      if (i === currentPage) {
        text = `${this.pagingIcons.Current}`;
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
    const { mode, maxOnLine, buttons, action, currentValue, callbackField } = options;

    const inlineButtons = buttons.map((button) => {
      const isCurrent = currentValue === button.payload[callbackField];
      let icon: string;
      switch (mode) {
        case SwitchButtonMode.Radio:
          icon = isCurrent ? this.switchIcons.RadioButtonOn : this.switchIcons.RadioButtonOff;
          break;
        case SwitchButtonMode.Custom:
          icon = '';
          break;
        case SwitchButtonMode.Select:
          icon = isCurrent ? this.switchIcons.Current : '';
          break;
        default:
          icon = isCurrent ? this.switchIcons.Current : '';
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
        return [inlineButtons.slice(0, half + 1), inlineButtons.slice(half + 1)];
      }
    }

    const sortedButtons: InlineKeyboardButton[][] = [];

    while (inlineButtons.length > 0) {
      sortedButtons.push(inlineButtons.splice(0, maxOnLine));
    }

    return sortedButtons;
  }

  public backButtonExt<A extends ActionItem>(
    options: BackButtonOptionsExt<A>,
  ): InlineKeyboardButton {
    const { labelKey, actionItem } = options;
    const ctx = this.contextService.get();
    const { payload } = ctx;
    if (payload && 'back' in payload) {
      const { backPayload, entranceActionId } = payload.back as BackData;
      const entranceAction = this.payloadService.actionsService.getById(entranceActionId);
      const parent = entranceAction.meta.parent;
      if (parent?.meta.id === actionItem.meta.id) {
        return {
          text: this.locale.text(labelKey || 'back-button'),
          callback_data: backPayload,
        };
      }
    }

    return this.backButton(options);
  }

  public backButton<A extends ActionItem>(options: BackButtonOptions<A>): CustomInlineButton {
    let callbackData: string;
    if ('callbackData' in options) {
      callbackData = options.callbackData;
    } else {
      callbackData = this.payloadService.encode(options.actionItem, options.actionData);
    }
    return {
      text: this.locale.text('back-button'),
      callback_data: callbackData,
      qzarStyle: QzarButtonStyles.Back,
    };
  }

  public refreshButton<A extends ActionItem>(
    options?: RefreshButtonOptions<A>,
  ): CustomInlineButton {
    const ctx = this.contextService.get();

    const optionsSafe = options || {};

    let callbackData: string;
    if ('actionItem' in optionsSafe) {
      callbackData = this.payloadService.encode(optionsSafe.actionItem, optionsSafe.actionData);
    } else if ('callbackData' in optionsSafe && optionsSafe.callbackData) {
      callbackData = optionsSafe.callbackData;
    } else {
      callbackData = this.payloadService.encode(ctx.action);
    }

    return {
      text: this.locale.text('refresh-button'),
      callback_data: callbackData,
      qzarStyle: QzarButtonStyles.Refresh,
    };
  }
}
