import { NextResponse } from "next/server";
import { db } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
type Product = {
  product_id: string;
  product_name: string;
  product_code: string;
  product_price: number;
  is_active: boolean;
  category_type?: string;
  category_title?: string;
};
export async function POST() {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const settings = await db.settings.findUnique();
  const selectedId =
    typeof settings?.selectedLevelId === "string"
      ? settings.selectedLevelId
      : null;
  const level = selectedId
    ? await db.priceLevel.findUnique({ where: { id: selectedId } })
    : await db.priceLevel.findFirst();
  const siteUrl = process.env.PRODUCTS_SITE_URL;
  if (!siteUrl)
    return NextResponse.json(
      { error: "PRODUCTS_SITE_URL belum diatur di backend (.env)." },
      { status: 400 },
    );
  if (
    !level ||
    typeof level.id !== "string" ||
    typeof level.name !== "string" ||
    typeof level.apiKey !== "string" ||
    !level.apiKey
  )
    return NextResponse.json(
      { error: "API Key untuk level harga yang dipilih belum diisi." },
      { status: 400 },
    );
  await db.activityLog.create({
    data: {
      type: "SYNC_START",
      message: `[Level ${level.name}] Fetching produk dari SPL API...`,
    },
  });
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/v1/products`, {
      headers: { Authorization: level.apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`API mengembalikan status ${response.status}`);
    const payload = (await response.json()) as { data?: unknown };
    if (!Array.isArray(payload.data))
      throw new Error("Format respons API tidak valid");
    const products = payload.data.filter(
      (product): product is Product =>
        typeof product === "object" &&
        product !== null &&
        typeof (product as Product).product_name === "string" &&
        (product as Product).is_active !== false,
    );
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const name = product.category_title || "Tanpa kategori";
      groups.set(name, [...(groups.get(name) || []), product]);
    }
    for (const [title, items] of groups)
      await db.productCategory.upsert({
        where: { levelId_title: { levelId: level.id, title } },
        update: {
          type: items[0].category_type || null,
          productCount: items.length,
          products: items,
          syncedAt: new Date(),
        },
        create: {
          levelId: level.id,
          title,
          type: items[0].category_type || null,
          productCount: items.length,
          products: items,
        },
      });
    await db.activityLog.create({
      data: {
        type: "SYNC",
        message: `[Level ${level.name}] Refresh sukses: ${groups.size} kategori, ${products.length} produk`,
      },
    });
    return NextResponse.json({
      message: `${products.length} produk aktif untuk ${level.name} berhasil disinkronkan`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menghubungkan API";
    await db.activityLog.create({
      data: { type: "ERROR", message: `[Level ${level?.name || "aktif"}] Refresh gagal: ${message}` },
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
