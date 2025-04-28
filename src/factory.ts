import { FrameworkConfig } from "./types";
import { CONFIG_KEY, diContainer, Provider, initializeInjects } from "./di";
import { Telegram } from "./telegram";

export class TgFactory {
  public static create(frameworkConfig: FrameworkConfig): Telegram {
    const provider: Provider<FrameworkConfig> = {
      useFactory: () => frameworkConfig,
    };
    diContainer.register(CONFIG_KEY, provider);

    const tg = diContainer.resolve<Telegram>(Telegram);

    const instances = initializeInjects(tg);
    instances.forEach((instance) => {
      if ("onApplicationStart" in instance) {
        instance.onApplicationStart();
      }
    });

    return tg;
  }
}
