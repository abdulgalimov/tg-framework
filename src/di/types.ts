export const INJECTABLE_KEY = Symbol("INJECTABLE_KEY");
export const INJECT_PROPS = Symbol("INJECT_PROPS");
export const INJECT_ARGS = Symbol("INJECT_ARGS");
export const CONFIG_KEY = Symbol("CONFIG_KEY");

export type FactoryProvider<T = any> = {
  useFactory: (...args: any[]) => T;
  inject?: any[];
};

export type Provider<T = any> =
  | (new (...args: any[]) => T)
  | FactoryProvider<T>;
