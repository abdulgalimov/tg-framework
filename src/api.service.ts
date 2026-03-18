import type { CallService } from './call.service';
import { GetArgsFromMethod, GetReturnFromMethod, type SendFile } from './types';
import { ApiMethods } from '@grammyjs/types';

type FileOrString = SendFile | string;
type SendFileArgs = { photo?: FileOrString; document?: FileOrString };
const fileFields = ['photo', 'document'] as const;

function extractFile(args: SendFileArgs) {
  for (const field of fileFields) {
    if (field in args) {
      return {
        file: args[field]!,
        fileField: field,
      };
    }
  }
  return null;
}

export class ApiService {
  private readonly callService: CallService;
  public constructor(callService: CallService) {
    this.callService = callService;
  }

  private createFormData(args: SendFileArgs): any {
    let extracted = extractFile(args);
    if (!extracted) {
      return args;
    }
    const { file, fileField } = extracted;

    if (typeof file === 'string') {
      return args;
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

  public async call<Method extends keyof ApiMethods<SendFile>>(
    method: Method,
    ...args: GetArgsFromMethod<Method> extends null ? [] : [GetArgsFromMethod<Method>]
  ): Promise<GetReturnFromMethod<Method>> {
    let arg: any = args[0];
    if (typeof arg === 'object' && arg !== null) {
      fileFields.forEach((field) => {
        if (field in arg) {
          arg = this.createFormData(arg);
        }
      });
    }
    return (await this.callService.callApi(method, arg as object)) as GetReturnFromMethod<Method>;
  }
}
