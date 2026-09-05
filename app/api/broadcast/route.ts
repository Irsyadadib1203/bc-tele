import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { makeBroadcastImage } from "@/lib/broadcast-image";
import { db } from "@/lib/mysql";

type Product = { product_name: string; product_code: string; product_price: number };
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
    } else {
      current += current ? `\n${line}` : line;
    }
  }

  if (current) messages.push(current);
  return messages;
}

function matchesExcludedPrefix(product: Product, prefixes: string[]) {
  const code = product.product_code.toLowerCase();
  return prefixes.some((prefix) => code.startsWith(prefix));
}

async function telegramRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as TelegramResponse;
  if (!response.ok || !payload.ok) throw new Error(payload.description ?? "Telegram menolak pesan");
}

export async function POST(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });

  const body = (await request.json()) as { categoryId?: unknown };
  if (typeof body.categoryId !== "string") return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });

  const [category, settings] = await Promise.all([
    db.productCategory.findUnique({ where: { id: body.categoryId } }),
    db.settings.findUnique(),
  ]);

  if (!category) return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  if (typeof settings?.botToken !== "string" || typeof settings.targetChatId !== "string" || !settings.botToken || !settings.targetChatId) {
    return NextResponse.json({ error: "Bot Token dan Target Chat ID harus dikonfigurasi." }, { status: 400 });
  }

  const prefixes = String(category.excludedPrefixes ?? "")
    .split(",")
    .map((prefix) => prefix.trim().toLowerCase())
    .filter(Boolean);
  const products = (category.products as Product[]).filter(
    (product) => !category.prefixFilterEnabled || !matchesExcludedPrefix(product, prefixes),
  );

  if (!products.length) return NextResponse.json({ error: "Tidak ada produk setelah filter prefix diterapkan." }, { status: 400 });

  const title = String(category.title);
  const caption = String(settings.caption ?? `<b>${title}</b>\nHarga terbaru tersedia.`)
    .replaceAll("{category}", escapeHtml(title))
    .replaceAll("{count}", String(products.length));
  const telegramUrl = `https://api.telegram.org/bot${settings.botToken}`;

  try {
    if (settings.broadcastFormat === "text") {
      const lines = products.map(
        (product) => `${escapeHtml(product.product_name)} Rp. ${new Intl.NumberFormat("id-ID").format(product.product_price || 0)}`,
      );
      const messages = splitMessages(lines, `${caption}\n`);

      for (const text of messages) {
        await telegramRequest(`${telegramUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: settings.targetChatId, text, parse_mode: "HTML" }),
        });
      }

      await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast teks ${title} berhasil dikirim (${products.length} produk)`, meta: { categoryId: body.categoryId } } });
      return NextResponse.json({ message: `Daftar harga ${title} berhasil dikirim dalam ${messages.length} pesan` });
    }

    const image = makeBroadcastImage(title, products, String(settings.primaryColor ?? "#5B5BD6"), String(settings.accentColor ?? "#A78BFA"));
    const formData = new FormData();
    formData.set("chat_id", settings.targetChatId);
    formData.set("photo", new Blob([image], { type: "image/png" }), `${title}.png`);
    formData.set("caption", caption);
    formData.set("parse_mode", "HTML");
    await telegramRequest(`${telegramUrl}/sendPhoto`, { method: "POST", body: formData });

    await db.activityLog.create({ data: { type: "BROADCAST", message: `Broadcast gambar ${title} berhasil dikirim (${products.length} produk)`, meta: { categoryId: body.categoryId } } });
    return NextResponse.json({ message: `Broadcast ${title} berhasil dikirim` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim Telegram";
    await db.activityLog.create({ data: { type: "ERROR", message: `Broadcast ${title} gagal: ${message}` } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
