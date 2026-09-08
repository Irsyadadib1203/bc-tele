import { makeBroadcastImage } from "@/lib/broadcast-image";
import { priceWithSellerFee } from "@/lib/fee";
import { db } from "@/lib/mysql";
import { productsForPriceList } from "@/lib/product-order";
import { telegramTargetChatIds } from "@/lib/telegram-targets";

type Product = {
  product_code: string;
  product_price: number;
  product_name?: string;
};
export type PriceChangedProduct = Product & { previousPrice: number };
export type BroadcastFormat = "text" | "image";
type TelegramResponse = { ok?: boolean; description?: string };
const TELEGRAM_MAX_LENGTH = 3900;

function telegramTargetError(failures: string[]) {
  return new Error(`Gagal mengirim ke ${failures.join("; ")}`);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function splitMessages(lines: string[], heading: string) {
  const messages: string[] = [];
  let current = heading;
  for (const line of lines) {
    if (`${current}\n${line}`.length > TELEGRAM_MAX_LENGTH) {
      if (current) messages.push(current);
      current = line;
    } else current += current ? `\n${line}` : line;
  }
  if (current) messages.push(current);
  return messages;
}
function matchesExcludedPrefix(product: Product, prefixes: string[]) {
  return prefixes.some((prefix) => product.product_code.toLowerCase().startsWith(prefix));
}

/** Keep the same product order for text and image broadcasts. */
function productsForPriceBroadcast(products: Product[]) {
  return productsForPriceList(products);
}

function feeNotice(level: { feeEnabled?: boolean; name?: string | null } | null) {
  if (!level?.feeEnabled) return undefined;
  const levelName = String(level.name ?? "seller").trim() || "seller";
  return `Harga sudah termasuk fee ${levelName}`;
}

function headerDesign(level: any) {
  return {
    primaryColor: String(level?.primaryColor ?? "#5B5BD6"),
    accentColor: String(level?.accentColor ?? "#A78BFA"),
    headerTitle: String(level?.headerTitle ?? "PRICE UPDATE"),
  };
}

function captionTemplate(level: any, format: BroadcastFormat, fallback: string) {
  const value = format === "text" ? level?.caption : level?.imageCaption;
  return typeof value === "string" && value.trim() ? value : fallback;
}

function includedProducts(category: any) {
  const prefixes = String(category.excludedPrefixes ?? "")
    .split(",")
    .map((prefix) => prefix.trim().toLowerCase())
    .filter(Boolean);
  return (category.products as Product[]).filter(
    (product) =>
      !category.prefixFilterEnabled ||
      !matchesExcludedPrefix(product, prefixes),
  );
}

async function productsWithMemberPrice(category: any) {
  const products = includedProducts(category);
  if (!products.length) {
    throw new Error("Tidak ada produk setelah filter prefix diterapkan.");
  }
  const level =
    typeof category.levelId === "string"
      ? await db.priceLevel.findUnique({ where: { id: category.levelId } })
      : null;
  return products.map((product) => ({
    ...product,
    product_price: priceWithSellerFee(
      product.product_price,
      level ?? {},
      product,
    ),
  }));
}

/** Used by both Telegram and the catalogue preview so they always render
 * the same filtered products, member prices, styling, and WIB timestamp. */
export async function makeCategoryBroadcastImage(
  category: any,
  settings: any,
  updatedAt = new Date(),
) {
  const products = await productsWithMemberPrice(category);
  const level = typeof category.levelId === "string"
    ? await db.priceLevel.findUnique({ where: { id: category.levelId } })
    : null;
  const design = headerDesign(level);
  return makeBroadcastImage(
    String(category.title),
    productsForPriceBroadcast(products),
    design.primaryColor,
    design.accentColor,
    updatedAt,
    feeNotice(level),
    design.headerTitle,
    typeof level?.name === "string" ? level.name : undefined,
  );
}

/** Sends a compact image containing only products whose price changed during
 * a catalogue sync. Existing prefix exclusions and member fees still apply. */
export async function sendPriceChangeBroadcast(
  category: any,
  changedProducts: PriceChangedProduct[],
  settings: any,
) {
  const targets = telegramTargetChatIds(settings);
  if (!settings?.botToken || !targets.length) {
    throw new Error("Bot Token dan Target Chat ID harus dikonfigurasi.");
  }
  const visibleProducts = includedProducts({ ...category, products: changedProducts }) as PriceChangedProduct[];
  if (!visibleProducts.length) return false;
  const level = typeof category.levelId === "string"
    ? await db.priceLevel.findUnique({ where: { id: category.levelId } })
    : null;
  const design = headerDesign(level);
  const productsWithDifference = visibleProducts.map((product) => {
    const newPrice = priceWithSellerFee(product.product_price, level ?? {}, product);
    const oldPrice = priceWithSellerFee(product.previousPrice, level ?? {}, product);
    return { ...product, product_price: newPrice, priceChange: newPrice - oldPrice };
  }).filter((product) => product.priceChange !== 0);
  if (!productsWithDifference.length) return false;
  const title = String(category.title);
  const caption = captionTemplate(level, "image", `<b>${title}</b>\nPerubahan harga terbaru.`)
    .replaceAll("{category}", escapeHtml(title))
    .replaceAll("{count}", String(productsWithDifference.length));
  const image = await makeBroadcastImage(
    title,
    productsForPriceBroadcast(productsWithDifference),
    design.primaryColor,
    design.accentColor,
    undefined,
    feeNotice(level),
    design.headerTitle,
    typeof level?.name === "string" ? level.name : undefined,
  );
  const failures: string[] = [];
  for (const target of targets) {
    const formData = new FormData();
    formData.set("chat_id", target);
    formData.set("photo", new Blob([image], { type: "image/png" }), `${title}-perubahan-harga.png`);
    formData.set("caption", caption);
    formData.set("parse_mode", "HTML");
    try {
      await telegramRequest(`https://api.telegram.org/bot${settings.botToken}/sendPhoto`, { method: "POST", body: formData });
    } catch (error) {
      failures.push(`${target}: ${error instanceof Error ? error.message : "Telegram menolak pesan"}`);
    }
  }
  if (failures.length) throw telegramTargetError(failures);
  await db.activityLog.create({ data: { type: "AUTO_PRICE_CHANGE", message: `BC perubahan harga ${title} berhasil dikirim ke ${targets.length} target (${productsWithDifference.length} produk)`, meta: { categoryId: category.id } } });
  return true;
}
async function telegramRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as TelegramResponse;
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? "Telegram menolak pesan");
}

async function sendCategory(category: any, settings: any, format: BroadcastFormat) {
  const productsWithFee = await productsWithMemberPrice(category);
  const title = String(category.title);
  const level = typeof category.levelId === "string"
    ? await db.priceLevel.findUnique({ where: { id: category.levelId } })
    : null;
  const caption = captionTemplate(level, format, `<b>${title}</b>\nHarga terbaru tersedia.`).replaceAll("{category}", escapeHtml(title)).replaceAll("{count}", String(productsWithFee.length));
  const telegramUrl = `https://api.telegram.org/bot${settings.botToken}`;
  const targets = telegramTargetChatIds(settings);
  if (!targets.length) throw new Error("Target Chat ID harus dikonfigurasi.");

  if (format === "text") {
    const lines = productsForPriceBroadcast(productsWithFee).map(
      (product) =>
        `${escapeHtml(product.product_code)} ${new Intl.NumberFormat("id-ID").format(product.product_price || 0)}`,
    );
    const messages = splitMessages(lines, `${caption}\n`);
    const failures: string[] = [];
    for (const target of targets) {
      try {
        for (const text of messages) await telegramRequest(`${telegramUrl}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: target, text, parse_mode: "HTML" }) });
      } catch (error) {
        failures.push(`${target}: ${error instanceof Error ? error.message : "Telegram menolak pesan"}`);
      }
    }
    if (failures.length) throw telegramTargetError(failures);
    await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast teks ${title} berhasil dikirim ke ${targets.length} target (${productsWithFee.length} produk)`, meta: { categoryId: category.id } } });
    return title;
  }

  const image = await makeCategoryBroadcastImage(category, settings);
  const failures: string[] = [];
  for (const target of targets) {
    const formData = new FormData();
    formData.set("chat_id", target);
    formData.set("photo", new Blob([image], { type: "image/png" }), `${title}.png`);
    formData.set("caption", caption);
    formData.set("parse_mode", "HTML");
    try {
      await telegramRequest(`${telegramUrl}/sendPhoto`, { method: "POST", body: formData });
    } catch (error) {
      failures.push(`${target}: ${error instanceof Error ? error.message : "Telegram menolak pesan"}`);
    }
  }
  if (failures.length) throw telegramTargetError(failures);
  await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast gambar ${title} berhasil dikirim ke ${targets.length} target (${productsWithFee.length} produk, 1 gambar)`, meta: { categoryId: category.id } } });
  return title;
}

export async function broadcastCategories(categories: any[], settings: any, format: BroadcastFormat) {
  const sent: string[] = [];
  const failed: string[] = [];
  for (const category of categories) {
    try {
      sent.push(await sendCategory(category, settings, format));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengirim Telegram";
      failed.push(`${category.title}: ${message}`);
      await db.activityLog.create({ data: { type: "ERROR", message: `Broadcast ${category.title} gagal: ${message}`, meta: { categoryId: category.id } } });
    }
  }
  return { sent, failed };
}
