import { FrameworkOptions } from "./types";
import {
  CONFIG_KEY,
  diContainer,
  Provider,
  initializeInjects,
  ENTRY_SERVICE_KEY,
} from "./di";
import { Telegram } from "./telegram";

export class TgFactory {
  public static create<EntryService>(
    frameworkOptions: FrameworkOptions,
    entryServiceClass: { new (): EntryService },
  ): Telegram<EntryService> {
    const configProvider: Provider<FrameworkOptions> = {
      useFactory: () => frameworkOptions,
    };
    diContainer.register(CONFIG_KEY, configProvider);

    diContainer.register(ENTRY_SERVICE_KEY, entryServiceClass);

    const tg = diContainer.resolve<Telegram<EntryService>>(Telegram);

    const instances = initializeInjects(tg);
    instances.forEach((instance) => {
      if ("onApplicationStart" in instance) {
        instance.onApplicationStart();
      }
    });

    return tg;
  }
}
