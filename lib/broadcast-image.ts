import sharp from "sharp";

type Product = { product_code: string; product_price: number };

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function productLabel(value: string) {
  return value.length > 52 ? `${value.slice(0, 51)}…` : value;
}

/** Creates a single PNG with one row for every product in the category. */
export async function makeBroadcastImage(
  title: string,
  products: Product[],
  primary: string,
  accent: string,
) {
  const width = 1080;
  const rowHeight = 62;
  const height = Math.max(650, 342 + products.length * rowHeight);
  const rows = products.map((product, index) => {
    const y = 260 + index * rowHeight;
    const price = new Intl.NumberFormat("id-ID").format(product.product_price || 0);
    return `<g><rect x="50" y="${y}" width="980" height="48" rx="10" fill="#ffffff" fill-opacity="0.97"/><text x="76" y="${y + 31}" fill="#25283d" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="600">${escapeXml(productLabel(product.product_code))}</text><text x="1002" y="${y + 31}" text-anchor="end" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700"> ${price}</text></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${escapeXml(primary)}"/><stop offset="1" stop-color="${escapeXml(accent)}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="54" y="48" width="238" height="42" rx="8" fill="#fff" fill-opacity="0.95"/><text x="73" y="76" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5">PRICE UPDATE</text><text x="58" y="153" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${escapeXml(productLabel(title))}</text><text x="60" y="202" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400">Harga terbaru hari ini</text>${rows}<text x="60" y="${height - 42}" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="2">BC JOSJIS</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
