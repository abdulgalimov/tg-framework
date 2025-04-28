import { INJECTABLE_KEY, Provider } from "./types";
import { diContainer } from "./container";

export function Injectable(): ClassDecorator {
  return (target) => {
    diContainer.register(target, target as unknown as Provider);
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
  };
}
