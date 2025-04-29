import { UPDATE_TOKEN } from "../tokens";

export function Update(): MethodDecorator {
  return (target, key, descriptor: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(UPDATE_TOKEN, key, target);
  };
}
