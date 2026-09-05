import { db as prisma } from "@/lib/mysql";
import { ProductTable } from "@/components/product-table";
export default async function ProductsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const level = settings?.selectedLevelId
    ? await prisma.priceLevel.findUnique({
        where: { id: settings.selectedLevelId },
      })
    : await prisma.priceLevel.findFirst({ orderBy: { createdAt: "asc" } });
  const categories: any[] = level
    ? await prisma.productCategory.findMany({
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
        levelName={level?.name || "-"}
      />
    </main>
  );
}
