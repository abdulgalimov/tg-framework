import { InjectOptions, InjectProp } from "../types";
import { INJECT_ARGS_TOKEN, INJECT_PROPS_TOKEN } from "../tokens";

export function Inject<T>(token?: T | symbol, options?: InjectOptions<T>) {
  return (target: any, key: any, index?: number) => {
    const type = token || Reflect.getMetadata("design:type", target, key!);

    if (index !== undefined) {
      const dependencies =
        Reflect.getMetadata(INJECT_ARGS_TOKEN, target) || new Map();

      dependencies.set(index, type);
      Reflect.defineMetadata(INJECT_ARGS_TOKEN, dependencies, target);
    } else {
      const props: InjectProp<T>[] =
        Reflect.getMetadata(INJECT_PROPS_TOKEN, target) || [];

      props.push({ key, type, options });

      Reflect.defineMetadata(INJECT_PROPS_TOKEN, props, target);
    }
  };
}
