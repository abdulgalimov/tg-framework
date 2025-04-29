import {
  AllActionsTree,
  FrameworkOptions,
  FrameworkServices,
  TelegramConfig,
} from "./types";
import {
  CONFIG_TOKEN,
  diContainer,
  Provider,
  ENTRY_SERVICE_EXT,
  LOGGER_TOKEN,
  STORAGE_SERVICE_EXT,
  ACTIONS_TREE_EXT,
  LOCALE_SERVICE_EXT,
} from "./di";
import { Telegram } from "./telegram";
import { Logger } from "./logger";

export class TgFactory {
  public static create<EntryService>(
    frameworkOptions: FrameworkOptions,
    services: FrameworkServices<EntryService>,
  ): Telegram<EntryService> {
    const { actionsTree, config } = frameworkOptions;
    const { entryService, logService, storageService, localeService } =
      services;

    diContainer.register(LOGGER_TOKEN, logService || Logger);

    const configProvider: Provider<TelegramConfig> = {
      useFactory: () => config,
    };
    diContainer.register(CONFIG_TOKEN, configProvider);

    diContainer.register(ENTRY_SERVICE_EXT, entryService);

    diContainer.register(STORAGE_SERVICE_EXT, storageService);

    diContainer.register(LOCALE_SERVICE_EXT, localeService);

    const actionsTreeProvider: Provider<AllActionsTree> = {
      useFactory: () => actionsTree,
    };
    diContainer.register(ACTIONS_TREE_EXT, actionsTreeProvider);

    const tg = diContainer.resolve<Telegram<EntryService>>(Telegram);

    const instances = diContainer.initializeInjects(tg);
    instances.forEach((instance) => {
      if ("onApplicationStart" in instance) {
        instance.onApplicationStart();
      }
    });

    return tg;
  }
}
