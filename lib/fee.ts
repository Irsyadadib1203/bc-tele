export type FeeOverride = { productCode: string; fee: number };

export type FeeConfiguration = {
  feeEnabled?: boolean;
  feeSmall?: number;
  feeMedium?: number;
  feeLarge?: number;
  feeOverrides?: FeeOverride[];
};

export type FeeProduct = { product_name?: string; product_code?: string };

function normalizeProductCode(value: unknown) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9 _-]*$/.test(code) ? code : "";
}

function productCodeKey(value: unknown) {
  return normalizeProductCode(value).replace(/[ _-]+/g, "");
}

export function normalizeFeeOverrides(value: unknown): FeeOverride[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, FeeOverride>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { productCode, fee } = item as Partial<FeeOverride> & { denom?: unknown };
    // Read the old persisted shape too, so existing settings remain usable.
    const normalizedProductCode = normalizeProductCode(productCode ?? (item as { denom?: unknown }).denom);
    const numericFee = Number(fee);
    if (normalizedProductCode && Number.isInteger(numericFee) && numericFee >= 0) {
      unique.set(productCodeKey(normalizedProductCode), { productCode: normalizedProductCode, fee: numericFee });
    }
  }
  return [...unique.values()];
}

export function sellerFee(price: number, configuration: FeeConfiguration, product?: FeeProduct): number {
  if (!configuration.feeEnabled || !Number.isFinite(price) || price < 0) return 0;

  const productCode = productCodeKey(product?.product_code);
  const override = normalizeFeeOverrides(configuration.feeOverrides).find(
    (item) => productCode && productCodeKey(item.productCode) === productCode,
  );
  if (override) return override.fee;

  if (price <= 10_000) return Math.max(0, Number(configuration.feeSmall) || 0);
  if (price <= 25_000) return Math.max(0, Number(configuration.feeMedium) || 0);
  return Math.max(0, Number(configuration.feeLarge) || 0);
}

export function priceWithSellerFee(price: number, configuration: FeeConfiguration, product?: FeeProduct): number {
  return price + sellerFee(price, configuration, product);
}
