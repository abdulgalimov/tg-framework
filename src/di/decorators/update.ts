import { UPDATE_KEY } from "../types";
import * as console from "node:console";

export function Update(): MethodDecorator {
  return (target, key, descriptor: TypedPropertyDescriptor<any>) => {
    console.log("Update", key);
    Reflect.defineMetadata(UPDATE_KEY, key, target);
  };
}
