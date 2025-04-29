import { InjectOptions, InjectProp, Provider, UpdateTarget } from "./types";
import { getProviderName } from "./utils";
import { LogService } from "../types";
import {
  INJECT_ARGS_TOKEN,
  INJECT_PROPS_TOKEN,
  LOGGER_TOKEN,
  UPDATE_TOKEN,
} from "./tokens";

export enum Scopes {
  Default = "default",
  Transient = "transient",
}

type RegisterOptions = {
  scope: Scopes;
};

const defaultRegisterOptions: RegisterOptions = {
  scope: Scopes.Default,
};

export class DiContainer {
  private logger?: LogService;

  private services = new Map<any, any>();
  private providers = new Map<
    any,
    { provider: Provider; options: RegisterOptions }
  >();

  private updateTarget: UpdateTarget | null = null;

  public getUpdateTarget(): UpdateTarget | null {
    return this.updateTarget;
  }

  public register<T>(
    token: any,
    provider: Provider<T>,
    options?: RegisterOptions,
  ) {
    if (this.logger) {
      this.logger.debug(
        `register ${getProviderName(token)} => ${getProviderName(provider)}`,
      );
    }

    this.providers.set(token, {
      provider,
      options: options || defaultRegisterOptions,
    });

    if (token === LOGGER_TOKEN) {
      this.logger = this.resolve<LogService>(LOGGER_TOKEN, {
        properties: {
          name: "di",
        },
      });
    }
  }

  resolve<T>(token: any, injectOptions?: InjectOptions<T>): T {
    const { provider, options } = this.providers.get(token) || {
      provider: token,
      options: defaultRegisterOptions,
    };

    if (this.services.has(token) && options.scope === Scopes.Default) {
      return this.services.get(token);
    }

    let instance: T;

    if (typeof provider === "function") {
      const dependencies =
        Reflect.getMetadata("design:paramtypes", provider) || [];

      const injectTokens: Map<number, any> =
        Reflect.getMetadata(INJECT_ARGS_TOKEN, provider) || new Map();

      const injections = dependencies.map((type: any, index: number) => {
        const injectToken = injectTokens.get(index) || type;
        return this.resolve(injectToken);
      });

      instance = new provider(...injections);
    } else if (typeof provider === "object" && "useFactory" in provider) {
      const injections = (provider.inject || []).map((dep: any) =>
        this.resolve(dep),
      );
      instance = provider.useFactory(...injections);
    } else {
      throw new Error(`Cannot resolve provider for token: ${token.toString()}`);
    }

    const properties = injectOptions?.properties;
    if (properties) {
      for (let key in properties) {
        instance[key] = properties[key];
      }
    }

    const prototype = Object.getPrototypeOf(instance);
    const updateKey = Reflect.getMetadata(UPDATE_TOKEN, prototype);

    if (updateKey) {
      this.updateTarget = {
        target: instance,
        key: updateKey,
      };
    }

    this.services.set(token, instance);
    return instance;
  }

  public initializeInjects(instance: any): Set<any> {
    const prototype = Object.getPrototypeOf(instance);

    const keys: InjectProp<any>[] =
      Reflect.getMetadata(INJECT_PROPS_TOKEN, prototype) || [];

    const instances = new Set();
    for (const { key, type, options } of keys) {
      instance[key] = diContainer.resolve(type, options);
      instances.add(instance[key]);

      this.initializeInjects(instance[key]).forEach((i: any) =>
        instances.add(i),
      );
    }

    return instances;
  }
}

export const diContainer = new DiContainer();
