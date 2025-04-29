import { UPDATE_KEY } from "../types";

export function Update(): MethodDecorator {
  return (target, key, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(UPDATE_KEY, true, target, key);
  };
}
