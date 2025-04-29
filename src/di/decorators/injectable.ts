import { Provider } from "../types";
import { diContainer } from "../container";
import { INJECTABLE_TOKEN } from "../tokens";

export function Injectable(): ClassDecorator {
  return (target) => {
    diContainer.register(target, target as unknown as Provider);
    Reflect.defineMetadata(INJECTABLE_TOKEN, true, target);
  };
}
