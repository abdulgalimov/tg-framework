import { INJECT_ARGS, INJECT_PROPS } from "../types";
import { diContainer } from "../container";

export function Inject(token?: any) {
  return (target: any, key: any, index?: number) => {
    const type = token || Reflect.getMetadata("design:type", target, key!);

    if (index !== undefined) {
      const dependencies =
        Reflect.getMetadata(INJECT_ARGS, target) || new Map();

      dependencies.set(index, type);
      Reflect.defineMetadata(INJECT_ARGS, dependencies, target);
    } else {
      const props = Reflect.getMetadata(INJECT_PROPS, target) || [];
      props.push({ key, type });
      Reflect.defineMetadata(INJECT_PROPS, props, target);
    }
  };
}

export function initializeInjects(instance: any): Set<any> {
  const prototype = Object.getPrototypeOf(instance);

  const keys = Reflect.getMetadata(INJECT_PROPS, prototype) || [];

  const instances = new Set();
  for (const { key, type } of keys) {
    instance[key] = diContainer.resolve(type);
    instances.add(instance[key]);

    initializeInjects(instance[key]).forEach((i: any) => instances.add(i));
  }

  return instances;
}
