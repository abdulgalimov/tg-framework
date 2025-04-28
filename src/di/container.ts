import { INJECT_ARGS, Provider } from "./types";
import { Logger } from "../logger";
import { getProviderName } from "./utils";

export class DiContainer {
  private readonly logger = new Logger("DI");

  private services = new Map<any, any>();
  private providers = new Map<any, Provider>();

  public register<T>(token: any, provider: Provider<T>) {
    this.logger.debug(
      `register ${getProviderName(token)} => ${getProviderName(provider)}`,
    );

    this.providers.set(token, provider);
  }

  resolve<T>(token: any): T {
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    const provider = this.providers.get(token) || token;

    let instance: T;

    if (typeof provider === "function") {
      const dependencies =
        Reflect.getMetadata("design:paramtypes", provider) || [];

      const injectTokens: Map<number, any> =
        Reflect.getMetadata(INJECT_ARGS, provider) || new Map();

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

    this.services.set(token, instance);
    return instance;
  }
}

export const diContainer = new DiContainer();
