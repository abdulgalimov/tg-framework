export class ShortsPayload {
  public shortKeys: Record<string, string> = {};

  public fullKeys: Record<string, string> = {};

  public shortValues: Record<string, string> = {};

  public fullValues: Record<string, string> = {};

  public configure(keys: Record<string, string>, values: Record<string, string>) {
    this.shortKeys = keys;

    this.fullKeys = Object.entries(this.shortKeys).reduce(
      (acc, [k, v]) => {
        acc[v] = k;
        return acc;
      },
      {} as Record<string, string>,
    );

    this.shortValues = values;

    this.fullValues = Object.entries(this.shortValues).reduce(
      (acc, [k, v]) => {
        acc[v] = k;
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}
