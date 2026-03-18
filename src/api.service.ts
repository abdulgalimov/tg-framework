import type { CallService } from './call.service';
import type { ApplyTraceForInstance, TgOtel } from './interfaces';
import {
  type EditMessageTextArgs,
  QzarButtonStyles,
  type SendDocumentArgs,
  type SendFile,
  type SendMessageArgs,
  type SendPhotoArgs,
  type TelegramMethod,
} from './types';

export class ApiService {
  private readonly callService: CallService;
  public constructor(callService: CallService, otel: TgOtel, applyTrace?: ApplyTraceForInstance) {
    this.callService = callService;

    applyTrace?.({
      kindName: 'tg',
      instance: this as unknown as Record<string, unknown>,
      otel,
    });
  }

  private applyStyleButtons(
    args: SendMessageArgs | EditMessageTextArgs | SendDocumentArgs | SendPhotoArgs,
  ) {
    if (!args.reply_markup?.inline_keyboard) {
      return;
    }
    const keyboard = args.reply_markup?.inline_keyboard;
    if (!keyboard) {
      return;
    }
    keyboard.forEach((buttons) => {
      buttons.forEach((button) => {
        let style: string;
        switch (button.qzarStyle) {
          case QzarButtonStyles.Refresh:
            style = 'primary';
            break;
          case QzarButtonStyles.Back:
            style = 'danger';
            break;
          default:
            return;
        }
        // @ts-expect-error
        button.style = style;
      });
    });
  }

  private createFormData(args: SendDocumentArgs | SendPhotoArgs): FormData {
    let file: SendFile | string;
    let fileField: 'document' | 'photo';
    if ('document' in args) {
      file = args.document;
      fileField = 'document';
    } else {
      file = args.photo;
      fileField = 'photo';
    }

    if (typeof file === 'string') {
      throw new Error('Invalid file format');
    }

    const formData = new FormData();

    Object.entries(args).forEach(([key, value]) => {
      if (key !== fileField) {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });

    const { buffer, filename, contentType } = file satisfies SendFile;
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });

    formData.append(fileField, blob, filename);

    return formData;
  }

  public sendDocument: TelegramMethod<'sendDocument'> = async (args) => {
    this.applyStyleButtons(args);

    if (typeof args.document === 'object') {
      const formData = this.createFormData(args);

      return await this.callService.callApi('sendDocument', formData);
    } else {
      return await this.callService.callApi('sendDocument', args);
    }
  };

  public sendPhoto: TelegramMethod<'sendPhoto'> = async (args) => {
    this.applyStyleButtons(args);

    if (typeof args.photo === 'object') {
      const formData = this.createFormData(args);

      return await this.callService.callApi('sendPhoto', formData);
    } else {
      return await this.callService.callApi('sendPhoto', args);
    }
  };

  public sendMessage: TelegramMethod<'sendMessage'> = async (args) => {
    this.applyStyleButtons(args as SendMessageArgs);

    return await this.callService.callApi('sendMessage', args);
  };

  public sendMessageDraft: TelegramMethod<'sendMessageDraft'> = async (args) => {
    this.applyStyleButtons(args as SendMessageArgs);

    return await this.callService.callApi('sendMessageDraft', args);
  };

  public deleteMessage: TelegramMethod<'deleteMessage'> = async (args) => {
    return await this.callService.callApi('deleteMessage', args);
  };

  public deleteMessages: TelegramMethod<'deleteMessages'> = async (args) => {
    return await this.callService.callApi('deleteMessages', args);
  };

  public sendSticker: TelegramMethod<'sendSticker'> = async (args) => {
    return await this.callService.callApi('sendSticker', args);
  };

  public editMessageText: TelegramMethod<'editMessageText'> = async (args) => {
    this.applyStyleButtons(args);

    return await this.callService.callApi('editMessageText', args);
  };

  public setMyCommands: TelegramMethod<'setMyCommands'> = async (args) => {
    return await this.callService.callApi('setMyCommands', args);
  };

  public answerCallbackQuery: TelegramMethod<'answerCallbackQuery'> = async (args) => {
    return await this.callService.callApi('answerCallbackQuery', args);
  };

  public answerInlineQuery: TelegramMethod<'answerInlineQuery'> = async (args) => {
    return await this.callService.callApi('answerInlineQuery', args);
  };

  public getMe: TelegramMethod<'getMe'> = async () => {
    return await this.callService.callApi('getMe');
  };
}
