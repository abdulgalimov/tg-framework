import { FrameworkConfig } from "./types";
import { CONFIG_KEY, diContainer, Provider } from "./di";
import { Telegram } from "./telegram";
import { initializeInjects } from "./di/inject";

export class TgFactory {
  public static create(frameworkConfig: FrameworkConfig): Telegram {
    const provider: Provider<FrameworkConfig> = {
      useFactory: () => frameworkConfig,
    };
    diContainer.register(CONFIG_KEY, provider);

    const tg = diContainer.resolve<Telegram>(Telegram);

    initializeInjects(tg);

    return tg;
  }
}
