type PriceListProduct = {
  product_code: string;
  product_name?: string;
};

// Membership, subscription, WDP, ML-TW, and FF-BP packages read better after the
// usual top-up denominations. Keep the source order intact within each group.
function isLastInPriceList(product: PriceListProduct) {
  const code = product.product_code.trim().toLowerCase();
  const label = `${product.product_name ?? ""} ${code}`.toLowerCase();

  return (
    // Tangkap ML-TW dan FF-BP baik exact match maupun sebagai bagian dari kode lain
    // (ml-tw, ml_tw, ml tw, mltw, ml-tw-01; ff-bp, ff_bp, ff bp, ffbp, ff-bp-01, dst).
    /(?:ml[\s_-]*tw|ff[\s_-]*bp)/.test(code) ||
    /membership|member|weekly|monthly|mingguan|bulanan|subscription|langganan|wdp|weekly\s*diamond\s*pass|diamond\s*pass/.test(label)
  );
}

function sortPriceListWithSpecialPackagesLast<T extends PriceListProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const aLast = isLastInPriceList(a);
    const bLast = isLastInPriceList(b);
    if (aLast === bLast) return 0; // urutan lain tetap stabil (tidak diacak)
    return aLast ? 1 : -1; // yang match didorong ke bawah
  });
}

/** Keeps standard denominations first for every price-list format. */
export function productsForPriceList<T extends PriceListProduct>(products: T[]) {
  return sortPriceListWithSpecialPackagesLast(products);
}
