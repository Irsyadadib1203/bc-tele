import { makeBroadcastImage } from "@/lib/broadcast-image";
import { priceWithSellerFee } from "@/lib/fee";
import { db } from "@/lib/mysql";

type Product = { product_code: string; product_price: number };
export type BroadcastFormat = "text" | "image";
type TelegramResponse = { ok?: boolean; description?: string };
const TELEGRAM_MAX_LENGTH = 3900;

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
  return makeBroadcastImage(
    String(category.title),
    products,
    String(settings.primaryColor ?? "#5B5BD6"),
    String(settings.accentColor ?? "#A78BFA"),
    updatedAt,
  );
}
async function telegramRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as TelegramResponse;
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? "Telegram menolak pesan");
}

async function sendCategory(category: any, settings: any, format: BroadcastFormat) {
  const productsWithFee = await productsWithMemberPrice(category);
  const title = String(category.title);
  const template = format === "text" ? settings.caption : settings.imageCaption;
  const caption = String(template ?? `<b>${title}</b>\nHarga terbaru tersedia.`).replaceAll("{category}", escapeHtml(title)).replaceAll("{count}", String(productsWithFee.length));
  const telegramUrl = `https://api.telegram.org/bot${settings.botToken}`;

  if (format === "text") {
    const lines = productsWithFee.map((product) => `${escapeHtml(product.product_code)} Rp. ${new Intl.NumberFormat("id-ID").format(product.product_price || 0)}`);
    const messages = splitMessages(lines, `${caption}\n`);
    for (const text of messages) await telegramRequest(`${telegramUrl}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: settings.targetChatId, text, parse_mode: "HTML" }) });
    await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast teks ${title} berhasil dikirim (${productsWithFee.length} produk)`, meta: { categoryId: category.id } } });
    return title;
  }

  const image = await makeCategoryBroadcastImage(category, settings);
  const formData = new FormData();
  formData.set("chat_id", settings.targetChatId);
  formData.set("photo", new Blob([image], { type: "image/png" }), `${title}.png`);
  formData.set("caption", caption);
  formData.set("parse_mode", "HTML");
  await telegramRequest(`${telegramUrl}/sendPhoto`, { method: "POST", body: formData });
  await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast gambar ${title} berhasil dikirim (${productsWithFee.length} produk, 1 gambar)`, meta: { categoryId: category.id } } });
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
