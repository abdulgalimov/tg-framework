export type FactoryProvider<T = any> = {
  useFactory: (...args: any[]) => T;
  inject?: any[];
};

export type Provider<T = any> =
  | (new (...args: any[]) => T)
  | FactoryProvider<T>;

export type UpdateTarget = {
  target: any;
  key: string;
};

export type InjectOptions<T> = {
  properties?: Partial<Record<keyof T, any>>;
};

export type InjectProp<T> = {
  key: string;
  type: any;
  options?: InjectOptions<T>;
};
