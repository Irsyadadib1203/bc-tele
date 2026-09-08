import { sendPriceChangeBroadcast, type PriceChangedProduct } from "@/lib/broadcast";
import { db } from "@/lib/mysql";
import { hasTelegramTargets } from "@/lib/telegram-targets";

type Product = {
  product_id: string;
  product_name?: string;
  product_code: string;
  product_price: number;
  is_active: boolean;
  category_type?: string;
  category_title?: string;
};

function productKey(product: Product) {
  return typeof product.product_id === "string" && product.product_id
    ? `id:${product.product_id}`
    : `code:${product.product_code}`;
}

function changedPrices(previous: Product[], current: Product[]): PriceChangedProduct[] {
  const oldProducts = new Map(previous.map((product) => [productKey(product), product]));
  return current.flatMap((product) => {
    const oldProduct = oldProducts.get(productKey(product));
    const oldPrice = Number(oldProduct?.product_price);
    const newPrice = Number(product.product_price);
    if (!oldProduct || !Number.isFinite(oldPrice) || !Number.isFinite(newPrice) || oldPrice === newPrice) return [];
    return [{ ...product, previousPrice: oldPrice }];
  });
}

export type ProductSyncResult = {
  levelName: string;
  categoryCount: number;
  productCount: number;
  automaticBroadcasts: number;
  automaticBroadcastFailures: number;
};

export type ProductSyncAllResult = {
  synced: ProductSyncResult[];
  skipped: string[];
  failed: { levelName: string; message: string }[];
};

/** Refreshes one explicitly supplied level. Its products, selections, and
 * price-change notices never depend on which level is open in the panel. */
export async function syncLevel(level: any, settings: any): Promise<ProductSyncResult> {
  const siteUrl = process.env.PRODUCTS_SITE_URL;
  if (!siteUrl) throw new Error("PRODUCTS_SITE_URL belum diatur di backend (.env).");
  if (!level || typeof level.id !== "string" || typeof level.name !== "string" || typeof level.apiKey !== "string" || !level.apiKey.trim()) {
    throw new Error("API Key untuk level ini belum diisi.");
  }

  await db.activityLog.create({ data: { type: "SYNC_START", message: `[Level ${level.name}] Fetching produk dari SPL API...` } });
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/v1/products`, {
      headers: { Authorization: level.apiKey, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`API mengembalikan status ${response.status}`);
    const payload = (await response.json()) as { data?: unknown };
    if (!Array.isArray(payload.data)) throw new Error("Format respons API tidak valid");
    const products = payload.data.filter(
      (product): product is Product =>
        typeof product === "object" && product !== null &&
        typeof (product as Product).product_code === "string" &&
        (product as Product).is_active !== false,
    );
    const groups = new Map<string, Product[]>();
    for (const product of products) {
      const title = product.category_title || "Tanpa kategori";
      groups.set(title, [...(groups.get(title) || []), product]);
    }

    let automaticBroadcasts = 0;
    let automaticBroadcastFailures = 0;
    for (const [title, items] of groups) {
      const previousCategory = (await db.productCategory.findMany({ where: { levelId: level.id, title } }))[0] as any;
      const priceChanges = changedPrices(Array.isArray(previousCategory?.products) ? previousCategory.products as Product[] : [], items);
      const category = await db.productCategory.upsert({
        where: { levelId_title: { levelId: level.id, title } },
        update: { type: items[0].category_type || null, productCount: items.length, products: items, syncedAt: new Date() },
        create: { levelId: level.id, title, type: items[0].category_type || null, productCount: items.length, products: items },
      });
      if (priceChanges.length && settings?.botToken && hasTelegramTargets(settings)) {
        try {
          if (await sendPriceChangeBroadcast(category, priceChanges, settings)) automaticBroadcasts += 1;
        } catch (error) {
          automaticBroadcastFailures += 1;
          const message = error instanceof Error ? error.message : "Gagal mengirim BC perubahan harga";
          await db.activityLog.create({ data: { type: "ERROR", message: `BC perubahan harga ${title} gagal: ${message}`, meta: { categoryId: category.id } } });
        }
      }
    }
    await db.activityLog.create({ data: { type: "SYNC", message: `[Level ${level.name}] Refresh sukses: ${groups.size} kategori, ${products.length} produk, ${automaticBroadcasts} BC perubahan harga terkirim${automaticBroadcastFailures ? `, ${automaticBroadcastFailures} gagal` : ""}` } });
    return { levelName: level.name, categoryCount: groups.size, productCount: products.length, automaticBroadcasts, automaticBroadcastFailures };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungkan API";
    await db.activityLog.create({ data: { type: "ERROR", message: `[Level ${level?.name || "aktif"}] Refresh gagal: ${message}` } });
    throw new Error(message);
  }
}

/** Refreshes every configured level independently. Levels without an API key
 * are skipped so one unfinished level cannot stop the others. */
export async function syncAllLevels(settings: any): Promise<ProductSyncAllResult> {
  const levels = await db.priceLevel.findMany();
  const result: ProductSyncAllResult = { synced: [], skipped: [], failed: [] };

  for (const level of levels) {
    if (typeof level?.apiKey !== "string" || !level.apiKey.trim()) {
      result.skipped.push(String(level?.name ?? "Tanpa nama"));
      continue;
    }
    try {
      result.synced.push(await syncLevel(level, settings));
    } catch (error) {
      result.failed.push({
        levelName: String(level?.name ?? "Tanpa nama"),
        message: error instanceof Error ? error.message : "Gagal menyinkronkan level",
      });
    }
  }

  return result;
}

/** @deprecated Use syncLevel or syncAllLevels. Kept for integrations that
 * intentionally refresh only the level currently selected in the panel. */
export async function syncSelectedLevel(settings: any): Promise<ProductSyncResult> {
  const selectedId = typeof settings?.selectedLevelId === "string" ? settings.selectedLevelId : null;
  const level = selectedId
    ? await db.priceLevel.findUnique({ where: { id: selectedId } })
    : await db.priceLevel.findFirst();
  return syncLevel(level, settings);
}
