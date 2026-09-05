import { FeeSettings } from "@/components/fee-settings";
import { db } from "@/lib/mysql";

export default async function FeesPage() {
  const settings = await db.settings.findUnique();
  const selectedLevelId = typeof settings?.selectedLevelId === "string" ? settings.selectedLevelId : null;
  const level = selectedLevelId
    ? await db.priceLevel.findUnique({ where: { id: selectedLevelId } })
    : await db.priceLevel.findFirst();

  return <main className="main">
    <div className="page-head"><div><h1 className="page-title">Fee Seller Berjenjang</h1><p className="page-subtitle">Tambahkan nominal tetap berdasarkan rentang harga produk untuk level yang sedang dipilih.</p></div></div>
    <FeeSettings level={level} />
  </main>;
}
