import sharp from "sharp";
import { formatWibDateTime } from "@/lib/time";

type Product = {
  product_code: string;
  product_price: number;
  /** Final selling-price difference, shown only on automatic change notices. */
  priceChange?: number;
};

// Telegram requires the combined width and height of a photo to stay below
// 10,000 px. We stay far below that by using a multi-column grid instead of
// a single ever-taller column, so large catalogues stay compact and legible.
const TELEGRAM_SAFE_MAX_TOTAL = 9_500; // width + height safety ceiling
const MINIMUM_ROW_HEIGHT = 16;
const CONTENT_TOP = 230;
const FOOTER_SPACE = 64;
const FOOTER_SPACE_WITH_FEE_NOTICE = 96;
const SIDE_PADDING = 50;
// Keeps multi-column catalogues compact without making adjacent cards touch.
const COLUMN_GAP = 12;

type LayoutTier = {
  /** Upper bound (inclusive) on product count for this tier. */
  maxProducts: number;
  columns: number;
  columnWidth: number;
  rowHeight: number;
};

// Each tier trades "more columns" for "shorter image" as the catalogue
// grows, instead of shrinking a single column down to unreadable rows.
const LAYOUT_TIERS: LayoutTier[] = [
  { maxProducts: 50, columns: 2, columnWidth: 340, rowHeight: 62 },
  { maxProducts: 150, columns: 4, columnWidth: 260, rowHeight: 34 },
  { maxProducts: 300, columns: 5, columnWidth: 220, rowHeight: 28 },
  { maxProducts: 400, columns: 5, columnWidth: 220, rowHeight: 28 },
  { maxProducts: 550, columns: 5, columnWidth: 220, rowHeight: 28 },
];

// Automatic price-change notices need more horizontal room for the change
// badge and can grow vertically when a product code wraps onto another line.
const PRICE_CHANGE_LAYOUT_TIERS: LayoutTier[] = [
  { maxProducts: 50, columns: 2, columnWidth: 440, rowHeight: 44 },
  { maxProducts: 150, columns: 4, columnWidth: 380, rowHeight: 42 },
  { maxProducts: 300, columns: 5, columnWidth: 340, rowHeight: 40 },
  { maxProducts: 400, columns: 5, columnWidth: 340, rowHeight: 40 },
  { maxProducts: 550, columns: 5, columnWidth: 310, rowHeight: 38 },
];

function pickLayout(count: number, isPriceChangeNotice: boolean): LayoutTier {
  const tier = (isPriceChangeNotice ? PRICE_CHANGE_LAYOUT_TIERS : LAYOUT_TIERS)
    .find((item) => count <= item.maxProducts);
  if (!tier) {
    throw new Error(
      `Jumlah produk (${count}) melebihi batas 550 untuk satu gambar. ` +
        "Pecah broadcast ini menjadi beberapa gambar/kategori.",
    );
  }
  return tier;
}

function canvasWidth(tier: LayoutTier) {
  return (
    SIDE_PADDING * 2 +
    tier.columns * tier.columnWidth +
    COLUMN_GAP * (tier.columns - 1)
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Truncates a label to fit a given column width, scaled from the original
 * 52-char budget that was tuned for a ~980px-wide single column. */
function productLabel(value: string, columnWidth: number) {
  const maxLen = Math.max(10, Math.floor((52 * columnWidth) / 980));
  return value.length > maxLen ? `${value.slice(0, maxLen - 1)}…` : value;
}

/** Splits text into visible lines without dropping any characters. */
function wrapText(value: string, maximumWidth: number, fontSize: number) {
  const charactersPerLine = Math.max(6, Math.floor(maximumWidth / (fontSize * 0.68)));
  const characters = Array.from(value);
  return Array.from(
    { length: Math.ceil(characters.length / charactersPerLine) },
    (_, index) => characters.slice(index * charactersPerLine, (index + 1) * charactersPerLine).join(""),
  );
}

/**
 * Show common game denominations consistently in the image, for example
 * MLH5 becomes ML-H5 and FF5 becomes FF-5. Existing separators are retained.
 */
function displayDenomination(value: string) {
  const code = value.trim();
  const match = code.match(/^(ML|FF)[\s_-]*(.+)$/i);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : code;
}

// Membership, subscription, WDP, and ML-TW packages read better after the
// usual top-up denominations. Keep the source order intact within each group.
function isLastInBroadcast(product: Product) {
  const code = product.product_code.trim().toLowerCase();

  return (
    // catches ml-tw, ml_tw, ml tw, mltw, ml-tw-01, etc.
    /ml[\s_-]*tw/.test(code) ||
    /membership|member|weekly|monthly|mingguan|bulanan|subscription|langganan|wdp|weekly[\s_-]*diamond[\s_-]*pass|diamond[\s_-]*pass/.test(code)
  );
}

/** Sorts products so membership/WDP/ML-TW-style codes always render last,
 * without disturbing the relative order of everything else. */
function sortProductsForBroadcast<T extends Product>(products: T[]): T[] {
  return [...products].sort((a, b) => {
    const aLast = isLastInBroadcast(a);
    const bLast = isLastInBroadcast(b);
    if (aLast === bLast) return 0; // stable: leaves original order untouched
    return aLast ? 1 : -1;
  });
}

function updatedAtLabel(date: Date) {
  return `Diperbarui: ${formatWibDateTime(date)}`;
}

function displayHeaderLabel(titleValue?: string, levelName?: string) {
  const title = titleValue?.trim() || "PRICE UPDATE";
  const level = levelName?.trim();
  const label = level ? `${title} • ${level}` : title;
  return label.length > 34 ? `${label.slice(0, 33)}…` : label;
}

/** Measures the actual server-rendered font width, then adds exactly 19px of
 * white space on both sides. This prevents a narrow glyph estimate from
 * making the right side of the pill look tighter than the left. */
async function headerPillWidth(label: string, maximum: number) {
  const measureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="60"><text x="0" y="30" fill="#000" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5">${escapeXml(label)}</text></svg>`;
  const { info } = await sharp(Buffer.from(measureSvg))
    .png()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 })
    .toBuffer({ resolveWithObject: true });
  return Math.min(maximum, info.width + 38);
}

/** Creates one compact PNG containing every product in the category, laid
 * out as a multi-column grid so large lists (up to ~550 items) stay
 * legible instead of turning into one extremely tall, cramped column. */
export async function makeBroadcastImage(
  title: string,
  products: Product[],
  primary: string,
  accent: string,
  updatedAt = new Date(),
  feeNotice?: string,
  headerTitle?: string,
  levelName?: string,
) {
  if (products.length === 0) {
    throw new Error("Tidak ada produk untuk dibuatkan gambar.");
  }

  const orderedProducts = sortProductsForBroadcast(products);
  const isPriceChangeNotice = orderedProducts.some((product) => {
    const difference = Number(product.priceChange);
    return Number.isFinite(difference) && difference !== 0;
  });
  const tier = pickLayout(orderedProducts.length, isPriceChangeNotice);
  const { columns, columnWidth, rowHeight } = tier;
  const width = canvasWidth(tier);
  const rowsPerColumn = Math.ceil(orderedProducts.length / columns);
  const footerSpace = feeNotice ? FOOTER_SPACE_WITH_FEE_NOTICE : FOOTER_SPACE;
  const compact = rowHeight < 40;
  const rowCardHeight = Math.max(14, rowHeight - 4);
  const rowFontSize = Math.max(10, Math.min(23, Math.floor(rowHeight * 0.58)));
  const textPadding = compact ? 8 : 14;
  const radius = compact ? 4 : 10;

  let height = CONTENT_TOP + rowsPerColumn * rowHeight + footerSpace;
  let rows: string;

  if (!isPriceChangeNotice) {
    // Regular image broadcasts retain the original compact tier sizing.
    rows = orderedProducts
      .map((product, index) => {
        const columnIndex = Math.floor(index / rowsPerColumn);
        const rowIndexInColumn = index % rowsPerColumn;
        const columnX = SIDE_PADDING + columnIndex * (columnWidth + COLUMN_GAP);
        const y = CONTENT_TOP + rowIndexInColumn * rowHeight;
        const textBaseline = y + Math.floor(rowCardHeight * 0.7) + 1;
        const codeX = columnX + textPadding;
        const priceX = columnX + columnWidth - textPadding;
        const price = new Intl.NumberFormat("id-ID").format(product.product_price || 0);
        const denomination = productLabel(displayDenomination(product.product_code), columnWidth);
        return `<g><rect x="${columnX}" y="${y}" width="${columnWidth}" height="${rowCardHeight}" rx="${radius}" fill="#ffffff" fill-opacity="0.97"/><text x="${codeX}" y="${textBaseline}" fill="#25283d" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="600">${escapeXml(denomination)}</text><text x="${priceX}" y="${textBaseline}" text-anchor="end" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="700">${price}</text></g>`;
      })
      .join("");
  } else {
    // Price-change rows keep the product code on one line at the tier font
    // size. Deliberately do not clip or wrap the code: long values may extend
    // into the middle change zone when necessary.
    // Use more generous type for smaller catalogues; dense catalogues still
    // retain a readable, compact size.
    const codeFontSize = rowHeight >= 42 ? 18 : rowHeight >= 40 ? 16 : 15;
    const detailFontSize = rowHeight >= 42 ? 17 : rowHeight >= 40 ? 15 : 14;
    const lineHeight = Math.max(codeFontSize, detailFontSize) + 3;
    const columnY = Array.from({ length: columns }, () => CONTENT_TOP);
    const changeRows: string[] = [];
    const contentWidth = columnWidth - textPadding * 2;
    const gap = 4;
    const longestPriceLabel = Math.max(
      ...orderedProducts.map((product) => new Intl.NumberFormat("id-ID").format(product.product_price || 0).length),
    );
    // These widths are calculated once for the whole image so each column is
    // vertically aligned, regardless of the value on an individual row.
    const priceZoneWidth = Math.max(
      Math.floor(contentWidth * 0.28),
      Math.ceil(longestPriceLabel * detailFontSize * 0.65) + 4,
    );
    const codeZoneWidth = Math.floor((contentWidth - priceZoneWidth - gap * 2) * 0.42);
    const differenceZoneWidth = contentWidth - priceZoneWidth - codeZoneWidth - gap * 2;

    for (const [index, product] of orderedProducts.entries()) {
      const columnIndex = Math.floor(index / rowsPerColumn);
      const columnX = SIDE_PADDING + columnIndex * (columnWidth + COLUMN_GAP);
      const y = columnY[columnIndex];
      const contentX = columnX + textPadding;
      const priceX = columnX + columnWidth - textPadding;
      const price = new Intl.NumberFormat("id-ID").format(product.product_price || 0);
      const difference = Number(product.priceChange);
      const differenceLabel =
        Number.isFinite(difference) && difference !== 0
          ? `${difference > 0 ? "▲" : "▼"} ${difference > 0 ? "+" : "-"}${new Intl.NumberFormat("id-ID").format(Math.abs(difference))}`
          : "";
      const differenceX = contentX + codeZoneWidth + gap;
      const differenceCenterX = differenceX + differenceZoneWidth / 2;
      const codeLines = [displayDenomination(product.product_code)];
      const differenceLines = differenceLabel
        ? wrapText(differenceLabel, differenceZoneWidth - 10, detailFontSize)
        : [];
      const contentHeight = Math.max(
        codeLines.length * lineHeight,
        differenceLines.length * lineHeight,
        detailFontSize,
      );
      const cardHeight = Math.max(rowCardHeight, contentHeight + 10);
      const codeTop = y + (cardHeight - codeLines.length * lineHeight) / 2;
      const differenceTop = y + (cardHeight - differenceLines.length * lineHeight - 6) / 2;
      const priceBaseline = y + (cardHeight + detailFontSize) / 2 - 1;
      const codeText = codeLines
        .map((line, lineIndex) => `<text x="${contentX}" y="${codeTop + codeFontSize + lineIndex * lineHeight}" fill="#25283d" font-family="Arial, Helvetica, sans-serif" font-size="${codeFontSize}" font-weight="600">${escapeXml(line)}</text>`)
        .join("");
      const differenceText = differenceLines.length
        ? `<rect x="${differenceX}" y="${differenceTop}" width="${differenceZoneWidth}" height="${differenceLines.length * lineHeight + 6}" rx="5" fill="${difference > 0 ? "#fde7eb" : "#e3f5eb"}"/>${differenceLines.map((line, lineIndex) => `<text x="${differenceCenterX}" y="${differenceTop + detailFontSize + 3 + lineIndex * lineHeight}" text-anchor="middle" fill="${difference > 0 ? "#d0445f" : "#178757"}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFontSize}" font-weight="700">${escapeXml(line)}</text>`).join("")}`
        : "";
      changeRows.push(`<g><rect x="${columnX}" y="${y}" width="${columnWidth}" height="${cardHeight}" rx="${radius}" fill="#ffffff" fill-opacity="0.97"/>${codeText}${differenceText}<text x="${priceX}" y="${priceBaseline}" text-anchor="end" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="${detailFontSize}" font-weight="700">${price}</text></g>`);
      columnY[columnIndex] += cardHeight + 4;
    }
    height = Math.max(...columnY) - 4 + footerSpace;
    rows = changeRows.join("");
  }

  if (rowHeight < MINIMUM_ROW_HEIGHT || width + height > TELEGRAM_SAFE_MAX_TOTAL) {
    throw new Error(
      "Jumlah produk terlalu banyak untuk satu gambar Telegram yang rapi.",
    );
  }

  const countLabel = `${orderedProducts.length} produk`;
  const headerLabel = displayHeaderLabel(headerTitle, levelName);
  const pillWidth = await headerPillWidth(headerLabel, width - 260);

  const feeNoticeText = feeNotice
    ? `<text x="60" y="${height - 62}" fill="#ffffff" fill-opacity="0.95" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">${escapeXml(productLabel(feeNotice, width - 120))}</text>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${escapeXml(primary)}"/><stop offset="1" stop-color="${escapeXml(accent)}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="54" y="48" width="${pillWidth}" height="42" rx="8" fill="#fff" fill-opacity="0.95"/><text x="73" y="76" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5">${escapeXml(headerLabel)}</text><text x="${width - 54}" y="76" text-anchor="end" fill="#ffffff" fill-opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="600">${escapeXml(countLabel)}</text><text x="58" y="153" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${escapeXml(productLabel(title, width - 116))}</text><text x="60" y="202" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400">${escapeXml(updatedAtLabel(updatedAt))}</text>${rows}${feeNoticeText}<text x="60" y="${height - 30}" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">Harga tercantum dalam rupiah (IDR)</text></svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
