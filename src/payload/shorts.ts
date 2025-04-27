export const shortKeys: Record<string, string> = {
  tokenSource: "ts",
  direction: "dr",
};

export const fullKeys: Record<string, string> = Object.entries(
  shortKeys,
).reduce((acc, [k, v]) => {
  return {
    ...acc,
    [v]: k,
  };
}, {});

export const shortValues: Record<string, string> = {};

export const fullValues: Record<string, string> = Object.entries(
  shortValues,
).reduce((acc, [k, v]) => {
  return {
    ...acc,
    [v]: k,
  };
}, {});
