type PriceListProduct = {
  product_code: string;
  product_name?: string;
};

// Membership, subscription, WDP, and ML-TW packages read better after the
// usual top-up denominations. Keep the source order intact within each group.
function isLastInPriceList(product: PriceListProduct) {
  const label = `${product.product_name ?? ""} ${product.product_code}`.toLowerCase();
  return (
    /^ml[\s_-]*tw$/.test(product.product_code.trim().toLowerCase()) ||
    /membership|member|weekly|monthly|mingguan|bulanan|subscription|langganan|wdp|weekly\s*diamond\s*pass|diamond\s*pass/.test(label)
  );
}

/** Keeps standard denominations first for every price-list format. */
export function productsForPriceList<T extends PriceListProduct>(products: T[]) {
  return [...products].sort(
    (left, right) => Number(isLastInPriceList(left)) - Number(isLastInPriceList(right)),
  );
}
