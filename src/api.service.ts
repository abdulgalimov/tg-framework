import type { CallService } from './call.service';
import {
  GetArgsFromMethod,
  GetReturnFromMethod,
  type SendDocumentArgs,
  type SendFile,
  type SendPhotoArgs,
  type TelegramMethod,
} from './types';
import { ApiMethods } from '@grammyjs/types/methods';
import { Message } from '@grammyjs/types/message';

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
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });

    const { buffer, filename, contentType } = file satisfies SendFile;
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });

    formData.append(fileField, blob, filename);

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

  public async call<Method extends keyof ApiMethods<SendFile>>(
    method: Method,
    ...args: GetArgsFromMethod<Method> extends null ? [] : [GetArgsFromMethod<Method>]
  ): Promise<GetReturnFromMethod<Method>> {
    const arg = args[0];
    return await this.callService.callApi(method, arg as object);
  }
}
