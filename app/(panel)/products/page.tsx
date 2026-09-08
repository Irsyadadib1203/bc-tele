import { db } from "@/lib/mysql";
import { ProductTable } from "@/components/product-table";
export default async function ProductsPage() {
  const settings = await db.settings.findUnique();
  const level = settings?.selectedLevelId
    ? await db.priceLevel.findUnique({
        where: { id: settings.selectedLevelId },
      })
    : await db.priceLevel.findFirst();
  const categories: any[] = level
    ? await db.productCategory.findMany({
        where: { levelId: level.id },
        orderBy: { title: "asc" },
      })
    : [];
  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Produk & Filter Prefix</h1>
          <p className="page-subtitle">
            Pilih kategori, atur kode yang dikecualikan, lalu broadcast ke
            Telegram.
          </p>
        </div>
      </div>
      <ProductTable
        categories={categories.map((c: any) => ({
          ...c,
          products: c.products as any[],
        }))}
        levelId={level?.id || null}
        levelName={level?.name || "-"}
        feeConfiguration={level ?? {}}
      />
    </main>
  );
}
