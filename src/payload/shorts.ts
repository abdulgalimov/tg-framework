export const shortKeys: Record<string, string> = {
  tokenSource: 'ts',
  direction: 'dr',
  poolAddress: 'pa',
  tokenAddress: 'ta',
  messageId: 'mi',
  editPage: 'ep',
  settingsId: 'si',
  actionType: 'at',
  priceSwitcher: 'ps',
  walletId: 'wi',
  copyTradingId: 'cti',
} as const;

export const fullKeys: Record<string, string> = Object.entries(shortKeys).reduce(
  (acc, [k, v]) => {
    acc[v] = k;
    return acc;
  },
  {} as Record<string, string>,
);

export let shortValues: Record<string, string> = {};

export let fullValues: Record<string, string> = {};

export function configureShortValues(values: Record<string, string>) {
  shortValues = { ...values };
  fullValues = Object.entries(shortValues).reduce(
    (acc, [k, v]) => {
      acc[v] = k;
      return acc;
    },
    {} as Record<string, string>,
  );
}
