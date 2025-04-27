import FormData from 'form-data';

import { CallService } from './call.service';
import type { SendDocumentArgs, SendFile, SendPhotoArgs, TelegramMethod } from './types';

export class ApiService {
  private readonly callService: CallService;
  public constructor(callService: CallService) {
    this.callService = callService;
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
        formData.append(key, value);
      }
    });

    const { stream, filename, contentType } = file satisfies SendFile;

    formData.append(fileField, stream, {
      filename,
      contentType,
    });

    return formData;
  }

  public sendDocument: TelegramMethod<'sendDocument'> = async (args) => {
    if (typeof args.document === 'object') {
      const formData = this.createFormData(args);

      return await this.callService.callApi('sendDocument', formData);
    } else {
      return await this.callService.callApi('sendDocument', args);
    }
  };

  public sendPhoto: TelegramMethod<'sendPhoto'> = async (args) => {
    if (typeof args.photo === 'object') {
      const formData = this.createFormData(args);

      return await this.callService.callApi('sendPhoto', formData);
    } else {
      return await this.callService.callApi('sendPhoto', args);
    }
  };

  public sendMessage: TelegramMethod<'sendMessage'> = async (args) => {
    return await this.callService.callApi('sendMessage', args);
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
