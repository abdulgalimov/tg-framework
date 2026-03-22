import type { CallbackQuery, ChosenInlineResult, InlineQuery } from '@grammyjs/types';

import type { Context, ContextAny } from '../context';
import {
  ActionCore,
  ActionForm,
  ActionInline,
  ActionInlinePayload,
  ActionItemKeyboardButton,
  ActionItemKeyboardButtonPayload,
  ActionItemPayload,
  Form,
  InlineChosenPayload,
  InlineQueryPayload,
  ReplyButtonPayload,
} from '../types';
import { BaseMw } from './base.mw';
import type { Middleware, MwServiceOptions } from './types';
import { InitType } from '../types/init';

const commandsReg = /^(?<command>\/\w+)(\s+(?<value>.+))?$/;

const startCommandReg = /^\/start (?<param>.+)$/;

export class ActionsMw<T extends InitType> extends BaseMw<T> implements Middleware {
  public constructor(options: MwServiceOptions<T>) {
    super(ActionsMw.name, options);
  }
  public async execute(): Promise<void> {
    const ctx = this.contextService.get();

    await this.getAction(ctx);

    if (!ctx.action) {
      this.logger.error('Fail get action from tg update');
    }
  }

  private async getAction(ctx: ContextAny) {
    const { update, user } = ctx;

    if (!user) {
      return;
    }

    const form = await this.formService.find(user.id);
    if (form) {
      await this.formAction(ctx, form);
      return;
    }

    await this.replyKeyboardAction(ctx);
    if (ctx.action) {
      return;
    }

    const text = update.message?.text;
    if (text) {
      this.textAction(ctx, text);
      return;
    }

    if (update.callback_query) {
      await this.callbackAction(ctx, update.callback_query);
      return;
    }

    if (update.inline_query) {
      await this.inlineQueryAction(ctx, update.inline_query);
      return;
    }

    if (update.chosen_inline_result) {
      await this.inlineChosenAction(ctx, update.chosen_inline_result);
      return;
    }

    ctx.action = this.actionsService.tree.core.none;
  }

  private textAction(ctx: ContextAny, text: string) {
    const commandExec = commandsReg.exec(text);

    if (commandExec?.groups) {
      const { command, value } = commandExec.groups;
      const commandCtx = ctx as Context<{ action: ActionCore['command'] }>;
      commandCtx.action = this.actionsService.tree.core.command;

      commandCtx.payload =
        value !== undefined
          ? {
              command: command!,
              value,
            }
          : {
              command: command!,
            };
    } else if (ctx.update.message?.via_bot) {
      ctx.action = this.actionsService.tree.core.viaBot;
    } else {
      ctx.action = this.actionsService.tree.core.text;
    }
  }

  private async replyKeyboardAction(ctx: ContextAny) {
    const { update } = ctx;
    const { message } = update;
    if (!message) {
      return null;
    }

    const keyboard = await this.replyKeyboard.find();
    if (!keyboard) {
      return;
    }

    const button = keyboard.buttons.find((button) => {
      if (button.text === message.text) {
        return true;
      }

      if ('request_contact' in button && message.contact) {
        return true;
      }

      if ('request_poll' in button && message.poll) {
        return true;
      }

      if ('request_location' in button && message.location) {
        return true;
      }

      if ('request_users' in button && message.users_shared) {
        return true;
      }

      return false;
    });

    if (!button?.payload) {
      return;
    }

    const [action, payload] = await this.payloadService.decode(button.payload);
    ctx.action = action;
    ctx.payload = payload;
  }

  private async parseStartCommand(text: string) {
    const exec = startCommandReg.exec(text);
    const startValue = exec?.groups?.param;
    if (!startValue) {
      return null;
    }

    try {
      return await this.payloadService.decode(startValue);
    } catch (error) {
      this.logger.debug('Failed decode payload action', {
        startValue,
        error,
      });
      return null;
    }
  }

  private async formAction(ctx: Context<{ action: ActionItemPayload }>, form: Form) {
    const { update } = ctx;

    ctx.form = form;
    ctx.payload = form.payload;

    const action = this.actionsService.getById<ActionForm>(form.actionId);

    if (update.message?.message_id) {
      form.historyMessages.push(update.message.message_id);
      await this.formService.save(form);

      const startResult = update.message.text
        ? await this.parseStartCommand(update.message.text)
        : null;

      if (startResult) {
        const [textAction, payload] = startResult;
        if (textAction.meta.childOf(action)) {
          ctx.action = textAction;
          ctx.payload = {
            ...ctx.payload,
            ...payload,
          };
          return;
        }
      }
    }

    if (update.callback_query) {
      const [callbackAction, payload] = await this.payloadService.decode(
        update.callback_query.data || '',
      );

      if (callbackAction.meta.childOf(action)) {
        ctx.action = callbackAction;
        ctx.payload = {
          ...ctx.payload,
          ...payload,
        };
        return;
      }
    }

    if (update.inline_query) {
      const { query, offset } = update.inline_query;
      const findResult = await this.inlineService.find(query);
      if (findResult) {
        const [inlineData, variables] = findResult;
        if (typeof inlineData === 'string') {
          return;
        }

        const inlineAction = this.actionsService.getById<ActionInline>(inlineData.actionId);
        if (inlineAction.meta.childOf(action)) {
          ctx.action = inlineAction;
          ctx.inline = inlineData;
          ctx.payload = {
            query: inlineData.query,
            variables,
            offset,
          } satisfies InlineQueryPayload;
        }
        return;
      }
    }

    if (update.chosen_inline_result) {
      const chosenInline = update.chosen_inline_result;
      const findResult = await this.inlineService.find(chosenInline.query);
      if (findResult) {
        const [inlineData, variables] = findResult;
        if (typeof inlineData === 'string') {
          return;
        }

        const inlineAction = this.actionsService.getById<ActionInline>(inlineData.actionId);
        if (inlineAction.meta.childOf(action)) {
          ctx.action = inlineAction.select;
          ctx.inline = inlineData;
          ctx.payload = {
            query: inlineData.query,
            variables,
            selectId: chosenInline.result_id,
          } satisfies InlineChosenPayload;
          return;
        }
      }
    }

    if (action.progress) {
      ctx.action = action.progress;
    } else {
      throw new Error('Invalid formAction.progress');
    }
  }

  private async callbackAction(
    ctx: Context<{ action: ActionItemPayload }>,
    callbackQuery: CallbackQuery,
  ) {
    try {
      const [action, payload] = await this.payloadService.decode(callbackQuery.data || '');

      ctx.action = action;
      ctx.payload = payload;
    } catch (error) {
      this.logger.error('Failed decode payload', {
        error,
        callbackData: callbackQuery.data,
      });

      ctx.action = this.actionsService.tree.core.none;
    }
  }

  private async inlineQueryAction(
    ctx: Context<{ action: ActionItemPayload }>,
    inlineQuery: InlineQuery,
  ) {
    const findResult = await this.inlineService.find(inlineQuery.query);
    if (!findResult) {
      ctx.action = this.actionsService.tree.core.inline;
      ctx.payload = {
        query: inlineQuery.query,
      } satisfies ActionInlinePayload;
      return;
    }

    const [inlineData, variables] = findResult;

    const varsList = variables
      .split(' ')
      .map((v) => v.trim())
      .filter((v) => !!v);

    const { parameter } = inlineData;

    let parsedVariables = variables;
    if (parameter) {
      if (varsList[0] === parameter) {
        varsList.shift();
        parsedVariables = varsList.join(' ');
      }
    }

    ctx.action = this.actionsService.getById(inlineData.actionId);
    ctx.inline = inlineData;
    ctx.payload = {
      query: inlineQuery.query,
      variables: parsedVariables,
      offset: inlineQuery.offset,
      ...inlineData.payload,
    } satisfies InlineQueryPayload;
  }

  private async inlineChosenAction(
    ctx: Context<{ action: ActionItemPayload }>,
    chosenInline: ChosenInlineResult,
  ) {
    const findResult = await this.inlineService.find(chosenInline.query);
    if (!findResult) {
      ctx.action = this.actionsService.tree.core.inline.select;
      ctx.payload = {
        query: chosenInline.query,
      } satisfies ActionInlinePayload;
      return;
    }

    const [inlineData, variables] = findResult;

    const action = this.actionsService.getById<ActionInline>(inlineData.actionId);
    ctx.action = action.select;
    ctx.inline = inlineData;
    ctx.payload = {
      query: inlineData.query,
      variables,
      selectId: chosenInline.result_id,
      ...inlineData.payload,
    } satisfies InlineChosenPayload;
  }
}
