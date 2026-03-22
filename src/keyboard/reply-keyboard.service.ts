import { ReplyButtonPayload, ReplyKeyboardPayload } from '../types';
import { ContextService } from '../context.service';
import { InitType } from '../types/init';
import type { ReplyKeyboardsStore } from '../interfaces';
import type { ReplyKeyboardMarkup } from '@grammyjs/types';
import type { ForceReply, ReplyKeyboardRemove } from '@grammyjs/types/markup';
import { ApiService } from '../api.service';

export class ReplyKeyboardService<T extends InitType> {
  public constructor(
    private readonly contextService: ContextService<T>,
    private readonly replyKeyboardsStore: ReplyKeyboardsStore,
    private readonly apiService: ApiService,
  ) {}

  public async create(
    messageId: number,
    text: string,
    keyboard: ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply | ReplyKeyboardPayload,
  ) {
    if ('force_reply' in keyboard) {
      return;
    }
    const { user } = this.contextService.get();

    const savedKeyboard = await this.find();
    await this.replyKeyboardsStore.delete(user.telegramId);

    if ('remove_keyboard' in keyboard) {
      if (savedKeyboard) {
        await this.apiService.call('deleteMessage', {
          chat_id: savedKeyboard.chatId,
          message_id: savedKeyboard.messageId,
        });
      }
      return;
    }

    const buttons: ReplyButtonPayload[] = keyboard.keyboard.flat().map((value) => {
      if (typeof value === 'string') {
        return {
          text: value,
        };
      }

      return value;
    });

    await this.replyKeyboardsStore.create(user.telegramId, messageId, text, buttons);
  }

  public async find() {
    const { user } = this.contextService.get();

    return await this.replyKeyboardsStore.find(user.telegramId);
  }
}
