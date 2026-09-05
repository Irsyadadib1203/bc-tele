import sharp from "sharp";

type Product = { product_code: string; product_price: number };

// Telegram requires the combined width and height of a photo to stay below
// 10,000 px. With a 1,080 px-wide image, 8,800 px leaves a safe margin.
const TELEGRAM_SAFE_MAX_HEIGHT = 8_800;
const MINIMUM_ROW_HEIGHT = 16;

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function productLabel(value: string) {
  return value.length > 52 ? `${value.slice(0, 51)}…` : value;
}

function updatedAtLabel(date: Date) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `Diperbarui: ${value("day")} ${value("month")} ${value("year")}, ${value("hour")}.${value("minute")} WIB`;
}

/** Creates one compact PNG containing every product in the category. */
export async function makeBroadcastImage(
  title: string,
  products: Product[],
  primary: string,
  accent: string,
  updatedAt = new Date(),
) {
  const width = 1080;
  const contentTop = 260;
  const footerSpace = 64;
  const maximumRowHeight = Math.floor(
    (TELEGRAM_SAFE_MAX_HEIGHT - contentTop - footerSpace) / products.length,
  );
  if (maximumRowHeight < MINIMUM_ROW_HEIGHT)
    throw new Error(
      "Jumlah produk terlalu banyak untuk satu gambar Telegram.",
    );

  // Keep the original roomy layout for small catalogues, then compact rows
  // progressively as the product count rises.
  const rowHeight = Math.min(62, maximumRowHeight);
  const rowCardHeight = Math.max(14, rowHeight - 4);
  const rowFontSize = Math.max(10, Math.min(23, Math.floor(rowHeight * 0.58)));
  const height = Math.max(650, contentTop + products.length * rowHeight + footerSpace);
  const rows = products.map((product, index) => {
    const y = contentTop + index * rowHeight;
    const price = new Intl.NumberFormat("id-ID").format(product.product_price || 0);
    const textBaseline = y + Math.floor(rowCardHeight * 0.7) + 1;
    const compact = rowHeight < 40;
    const cardX = compact ? 28 : 50;
    const cardWidth = compact ? 1024 : 980;
    const codeX = compact ? 42 : 76;
    const priceX = compact ? 1016 : 1002;
    const radius = compact ? 4 : 10;
    return `<g><rect x="${cardX}" y="${y}" width="${cardWidth}" height="${rowCardHeight}" rx="${radius}" fill="#ffffff" fill-opacity="0.97"/><text x="${codeX}" y="${textBaseline}" fill="#25283d" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="600">${escapeXml(productLabel(product.product_code))}</text><text x="${priceX}" y="${textBaseline}" text-anchor="end" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="700">${price}</text></g>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${escapeXml(primary)}"/><stop offset="1" stop-color="${escapeXml(accent)}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="54" y="48" width="238" height="42" rx="8" fill="#fff" fill-opacity="0.95"/><text x="73" y="76" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5">PRICE UPDATE</text><text x="58" y="153" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${escapeXml(productLabel(title))}</text><text x="60" y="202" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400">${escapeXml(updatedAtLabel(updatedAt))}</text>${rows}<text x="60" y="${height - 42}" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">Harga tercantum dalam rupiah (IDR)</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
