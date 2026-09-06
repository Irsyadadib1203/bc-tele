import sharp from "sharp";
import { formatWibDateTime } from "@/lib/time";

type Product = {
  product_code: string;
  product_price: number;
  /** Final selling-price difference, shown only on automatic change notices. */
  priceChange?: number;
};

// Telegram requires the combined width and height of a photo to stay below
// 10,000 px. We stay far below that, and we spend that budget on going
// *wider* first (more columns) before ever shrinking rows/fonts, and we
// size each column to the text it actually holds instead of a fixed guess.
const TELEGRAM_SAFE_MAX_TOTAL = 9_500; // width + height safety ceiling
const MINIMUM_ROW_HEIGHT = 16;
const CONTENT_TOP = 260;
const FOOTER_SPACE = 64;
const SIDE_PADDING = 50;
const COLUMN_GAP = 24;

// Soft aesthetic ceiling: we keep adding columns until the image would fit
// under this height, only stepping down to a smaller/denser row height once
// MAX_COLUMNS is reached and it still doesn't fit.
const TARGET_HEIGHT = 3_500;
const MAX_COLUMNS = 8;
// Roomiest first — width is cheap, height is what makes a list feel unwieldy.
const ROW_HEIGHT_CANDIDATES = [62, 52, 42, 34, 28, 22] as const;

// Rough average glyph advance for bold Arial at a given font size. Slightly
// generous on purpose so code/price text never clips.
const CHAR_WIDTH_FACTOR = 0.6;
const MIN_COLUMN_WIDTH = 170;
const MAX_COLUMN_WIDTH = 520;
const MIN_TEXT_GAP_ROOMY = 24;
const MIN_TEXT_GAP_COMPACT = 16;

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

function updatedAtLabel(date: Date) {
  return `Diperbarui: ${formatWibDateTime(date)}`;
}

function estimateTextWidth(charCount: number, fontSize: number) {
  return charCount * CHAR_WIDTH_FACTOR * fontSize;
}

function rowFontSizeFor(rowHeight: number) {
  return Math.max(10, Math.min(23, Math.floor(rowHeight * 0.58)));
}

/** 90th-percentile string length, so one unusually long outlier code
 * doesn't blow up every column — it just gets ellipsis-truncated instead. */
function percentileLength(lengths: number[], percentile: number) {
  if (!lengths.length) return 0;
  const sorted = [...lengths].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(percentile * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function formattedPriceLength(price: number) {
  return new Intl.NumberFormat("id-ID").format(price || 0).length;
}

function differenceLabelLength(priceChange: number | undefined) {
  const difference = Number(priceChange);
  if (!Number.isFinite(difference) || difference === 0) return 0;
  const sign = difference > 0 ? "+" : "-";
  return `(${sign}${new Intl.NumberFormat("id-ID").format(Math.abs(difference))})`.length;
}

/** Sizes a column tightly around the code/price/diff text it will actually
 * hold, instead of a fixed width that leaves a wide dead gap in the middle. */
function computeColumnWidth(products: Product[], rowHeight: number) {
  const fontSize = rowFontSizeFor(rowHeight);
  const compact = rowHeight < 40;
  const textPadding = compact ? 8 : 14;
  const textGap = compact ? MIN_TEXT_GAP_COMPACT : MIN_TEXT_GAP_ROOMY;

  const codeChars = percentileLength(
    products.map((p) => p.product_code.length),
    0.9,
  );
  const priceChars = Math.max(...products.map((p) => formattedPriceLength(p.product_price)));
  const diffChars = Math.max(0, ...products.map((p) => differenceLabelLength(p.priceChange)));

  let content = estimateTextWidth(codeChars, fontSize) + estimateTextWidth(priceChars, fontSize) + textGap;
  if (diffChars > 0) {
    content += estimateTextWidth(diffChars, fontSize) + textGap;
  }

  const columnWidth = Math.round(content + textPadding * 2);
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, columnWidth));
}

type Layout = {
  rowHeight: number;
  columns: number;
  rowsPerColumn: number;
  columnWidth: number;
  width: number;
  height: number;
};

/** Picks the roomiest row height and fewest columns that keep the image
 * under TARGET_HEIGHT — i.e. "grow sideways first". Only steps down to a
 * denser row height once MAX_COLUMNS worth of columns still isn't enough. */
function chooseLayout(products: Product[]): Layout {
  const n = products.length;

  for (const rowHeight of ROW_HEIGHT_CANDIDATES) {
    const columnWidth = computeColumnWidth(products, rowHeight);
    for (let columns = 1; columns <= MAX_COLUMNS; columns++) {
      const rowsPerColumn = Math.ceil(n / columns);
      const height = CONTENT_TOP + rowsPerColumn * rowHeight + FOOTER_SPACE;
      if (height <= TARGET_HEIGHT) {
        const width = SIDE_PADDING * 2 + columns * columnWidth + COLUMN_GAP * (columns - 1);
        return { rowHeight, columns, rowsPerColumn, columnWidth, width, height };
      }
    }
  }

  // Every candidate still runs taller than the aesthetic target — fall back
  // to the densest row height at max columns and accept a taller image, as
  // long as it stays inside Telegram's hard limit (checked by the caller).
  const rowHeight = ROW_HEIGHT_CANDIDATES[ROW_HEIGHT_CANDIDATES.length - 1];
  const columnWidth = computeColumnWidth(products, rowHeight);
  const columns = MAX_COLUMNS;
  const rowsPerColumn = Math.ceil(n / columns);
  const height = CONTENT_TOP + rowsPerColumn * rowHeight + FOOTER_SPACE;
  const width = SIDE_PADDING * 2 + columns * columnWidth + COLUMN_GAP * (columns - 1);
  return { rowHeight, columns, rowsPerColumn, columnWidth, width, height };
}

/** Creates one compact PNG containing every product in the category, laid
 * out as a content-fitted multi-column grid: columns are added (sideways)
 * before rows ever get taller or text gets smaller, and each column is
 * sized to its own text so there's no dead space between code and price. */
export async function makeBroadcastImage(
  title: string,
  products: Product[],
  primary: string,
  accent: string,
  updatedAt = new Date(),
) {
  if (products.length === 0) {
    throw new Error("Tidak ada produk untuk dibuatkan gambar.");
  }

  const layout = chooseLayout(products);
  const { columns, columnWidth, rowHeight, rowsPerColumn, width, height } = layout;

  if (rowHeight < MINIMUM_ROW_HEIGHT || width + height > TELEGRAM_SAFE_MAX_TOTAL) {
    throw new Error(
      "Jumlah produk terlalu banyak untuk satu gambar Telegram yang rapi.",
    );
  }

  const compact = rowHeight < 40;
  const rowCardHeight = Math.max(14, rowHeight - 4);
  const rowFontSize = rowFontSizeFor(rowHeight);
  const textPadding = compact ? 8 : 14;
  const radius = compact ? 4 : 10;

  const rows = products
    .map((product, index) => {
      const columnIndex = Math.floor(index / rowsPerColumn);
      const rowIndexInColumn = index % rowsPerColumn;
      const columnX = SIDE_PADDING + columnIndex * (columnWidth + COLUMN_GAP);
      const y = CONTENT_TOP + rowIndexInColumn * rowHeight;
      const textBaseline = y + Math.floor(rowCardHeight * 0.7) + 1;
      const codeX = columnX + textPadding;
      const priceX = columnX + columnWidth - textPadding;
      const price = new Intl.NumberFormat("id-ID").format(
        product.product_price || 0,
      );
      const difference = Number(product.priceChange);
      const differenceLabel =
        Number.isFinite(difference) && difference !== 0
          ? `(${difference > 0 ? "+" : "-"}${new Intl.NumberFormat("id-ID").format(Math.abs(difference))})`
          : "";
      const differenceText = differenceLabel
        ? `<text x="${columnX + columnWidth / 2}" y="${textBaseline}" text-anchor="middle" fill="${difference > 0 ? "#178757" : "#d0445f"}" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="700">${differenceLabel}</text>`
        : "";

      return `<g><rect x="${columnX}" y="${y}" width="${columnWidth}" height="${rowCardHeight}" rx="${radius}" fill="#ffffff" fill-opacity="0.97"/><text x="${codeX}" y="${textBaseline}" fill="#25283d" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="600">${escapeXml(productLabel(product.product_code, columnWidth))}</text>${differenceText}<text x="${priceX}" y="${textBaseline}" text-anchor="end" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="${rowFontSize}" font-weight="700">${price}</text></g>`;
    })
    .join("");

  const countLabel = `${products.length} produk`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${escapeXml(primary)}"/><stop offset="1" stop-color="${escapeXml(accent)}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/><rect x="54" y="48" width="238" height="42" rx="8" fill="#fff" fill-opacity="0.95"/><text x="73" y="76" fill="${escapeXml(primary)}" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700" letter-spacing="1.5">PRICE UPDATE</text><text x="${width - 54}" y="76" text-anchor="end" fill="#ffffff" fill-opacity="0.9" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="600">${escapeXml(countLabel)}</text><text x="58" y="153" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">${escapeXml(productLabel(title, width - 116))}</text><text x="60" y="202" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="400">${escapeXml(updatedAtLabel(updatedAt))}</text>${rows}<text x="60" y="${height - 42}" fill="#f5f5ff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700">Harga tercantum dalam rupiah (IDR)</text></svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}