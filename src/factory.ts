import {
  AllActionsTree,
  FrameworkOptions,
  FrameworkServices,
  TelegramConfig,
} from "./types";
import {
  ACTIONS_TREE_EXT,
  CONFIG_TOKEN,
  diContainer,
  ENTRY_SERVICE_EXT,
  LOCALE_SERVICE_EXT,
  LOGGER_TOKEN,
  Provider,
  Scopes,
  STORAGE_SERVICE_EXT,
} from "./di";
import { Telegram } from "./telegram";
import { Logger } from "./logger";

export class TgFactory<EntryService> {
  public constructor(
    private readonly frameworkOptions: FrameworkOptions,
    private readonly services: FrameworkServices<EntryService>,
  ) {
    this.registerServices();
  }

  private registerServices() {
    const { actionsTree, config } = this.frameworkOptions;
    const { entryService, logService, storageService, localeService } =
      this.services;

    diContainer.register(LOGGER_TOKEN, logService || Logger, {
      scope: Scopes.Transient,
    });

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
  }

  public register<T>(token: any, provider: Provider<T>) {
    diContainer.register(token, provider);
  }

  public create(): Telegram<EntryService> {
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
