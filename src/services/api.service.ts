import FormData from "form-data";

import { CallService } from "./call.service";
import {
  Methods,
  MethodsWithFile,
  methodsWithFile,
  SendFile,
  supportedMethods,
} from "../types";
import { Inject, Injectable } from "../di";

@Injectable()
export class ApiService {
  @Inject(CallService)
  private readonly callService!: CallService;

  public readonly methods: Methods;

  public constructor() {
    this.methods = supportedMethods.reduce((acc, method) => {
      return {
        ...acc,
        [method]: async (args: any) => {
          let argsData = args;
          if (method in methodsWithFile) {
            argsData = this.createFormData(method as MethodsWithFile, args);
          }
          return await this.callService.callApi(method, argsData);
        },
      };
    }, {}) as Methods;
  }

  private createFormData(method: MethodsWithFile, args: any): FormData | any {
    const fileField = methodsWithFile[method];
    const file: SendFile | string | null = args[fileField] || null;

    if (file == null) {
      throw new Error("Invalid file format");
    }

    if (typeof file === "string") {
      return args;
    }

    const formData = new FormData();

    Object.entries(args).forEach(([key, value]) => {
      if (key !== fileField) {
        formData.append(key, value);
      }
    });

    const { stream, filename, contentType } = file;

    formData.append(fileField, stream, {
      filename,
      contentType,
    });

    return formData;
  }
}
