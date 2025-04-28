import { Provider } from "./types";

export function getProviderName(provider: Provider | string) {
  if (typeof provider === "string") {
    return provider;
  }

  if (typeof provider === "function") {
    return provider.name || provider.constructor.name;
  }
  return "[factory]";
}
