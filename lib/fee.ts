export type FeeOverride = { denom: string; fee: number };

export type FeeConfiguration = {
  feeEnabled?: boolean;
  feeSmall?: number;
  feeMedium?: number;
  feeLarge?: number;
  feeOverrides?: FeeOverride[];
};

export type FeeProduct = { product_name?: string; product_code?: string };

export function normalizeFeeOverrides(value: unknown): FeeOverride[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, FeeOverride>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { denom, fee } = item as Partial<FeeOverride>;
    const normalizedDenom = String(denom ?? "").trim();
    const numericFee = Number(fee);
    if (/^\d+(?:\.\d+)?$/.test(normalizedDenom) && Number.isInteger(numericFee) && numericFee >= 0) {
      unique.set(normalizedDenom, { denom: normalizedDenom, fee: numericFee });
    }
  }
  return [...unique.values()];
}

function productNumberTokens(product?: FeeProduct): Set<string> {
  const source = `${product?.product_name ?? ""} ${product?.product_code ?? ""}`;
  return new Set(source.match(/\d+(?:\.\d+)?/g) ?? []);
}

export function sellerFee(price: number, configuration: FeeConfiguration, product?: FeeProduct): number {
  if (!configuration.feeEnabled || !Number.isFinite(price) || price < 0) return 0;

  const override = normalizeFeeOverrides(configuration.feeOverrides).find((item) => productNumberTokens(product).has(item.denom));
  if (override) return override.fee;

  if (price <= 10_000) return Math.max(0, Number(configuration.feeSmall) || 0);
  if (price <= 25_000) return Math.max(0, Number(configuration.feeMedium) || 0);
  return Math.max(0, Number(configuration.feeLarge) || 0);
}

export function priceWithSellerFee(price: number, configuration: FeeConfiguration, product?: FeeProduct): number {
  return price + sellerFee(price, configuration, product);
}
