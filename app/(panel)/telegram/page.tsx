import { db } from "@/lib/mysql";
import { ApiButton, ConfirmedForm } from "@/components/ui";
import { CustomBroadcastManager } from "@/components/custom-broadcast-manager";

export default async function TelegramPage() {
  const settings = await db.settings.findUnique();
  const levelId = typeof settings?.selectedLevelId === "string" ? settings.selectedLevelId : null;
  const level = levelId ? await db.priceLevel.findUnique({ where: { id: levelId } }) : null;
  const selectedCategories = levelId
    ? (await db.productCategory.findMany({ where: { levelId } })).filter((category: any) => category.selected)
    : [];
  const customBroadcasts = levelId ? await db.customBroadcast.findMany({ where: { levelId } }) : [];
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Kirim Telegram</h1><p className="page-subtitle">BC teks dan gambar tersimpan khusus untuk level {level?.name || "yang dipilih"}.</p></div></div>
    <section className="broadcast-group"><div className="broadcast-group-title"><span>Broadcast harga</span><p>Pesan yang dibuat dari katalog harga produk.</p></div><section className="card broadcast-selected-card"><div><h2>Kirim kategori pilihan</h2><p className="muted">{selectedCategories.length ? `${selectedCategories.length} kategori yang dicentang di Produk siap dikirim.` : "Belum ada kategori yang dicentang di Produk."}</p></div><div className="actions"><ApiButton url="/api/broadcast" body={{ selected: true, levelId, format: "image" }} className="btn btn-primary" confirmTitle="Konfirmasi broadcast gambar" confirmMessage={`Kirim broadcast gambar untuk ${selectedCategories.length} kategori yang dipilih?`}>Kirim semua gambar</ApiButton><ApiButton url="/api/broadcast" body={{ selected: true, levelId, format: "text" }} className="btn btn-ghost" confirmTitle="Konfirmasi broadcast teks" confirmMessage={`Kirim broadcast teks untuk ${selectedCategories.length} kategori yang dipilih?`}>Kirim semua teks</ApiButton></div></section>
    <div className="setting-grid">
      <ConfirmedForm action="/api/level-broadcast" className="card setting-card" confirmTitle="Konfirmasi BC gambar" confirmMessage={`Simpan caption gambar khusus untuk level ${level?.name || "ini"}?`}><h2>Broadcast gambar — {level?.name || "-"}</h2><p className="muted">Kirim kartu harga PNG. Warna, desain header, dan caption ini hanya berlaku untuk level ini.</p><input type="hidden" name="levelId" value={levelId || ""} /><label className="field">Caption gambar<textarea name="imageCaption" rows={8} defaultValue={level?.imageCaption || "<b>{category}</b>\nHarga terbaru tersedia.\nJumlah produk: {count}"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> dan <b>{"{count}"}</b>. Caption akan dikirim bersama gambar PNG.</p><button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!level}>Simpan BC gambar level ini</button></ConfirmedForm>
      <ConfirmedForm action="/api/level-broadcast" className="card setting-card" confirmTitle="Konfirmasi BC teks" confirmMessage={`Simpan caption teks khusus untuk level ${level?.name || "ini"}?`}><h2>Broadcast teks — {level?.name || "-"}</h2><p className="muted">Caption ini muncul sebelum daftar harga dan hanya berlaku untuk level ini. Mendukung HTML Telegram.</p><input type="hidden" name="levelId" value={levelId || ""} /><label className="field">Caption broadcast<textarea name="caption" rows={8} defaultValue={level?.caption || "<b>{category} - FFZ STORE</b>\n✅ Speed 1 - 2 detik\n✅ Open 24 jam anti cutoff"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> untuk kategori dan <b>{"{count}"}</b> untuk jumlah produk.</p><button className="btn btn-primary" style={{ marginTop: 20 }} disabled={!level}>Simpan BC teks level ini</button></ConfirmedForm>
    </div></section>
    <CustomBroadcastManager initial={customBroadcasts} levelId={levelId} levelName={level?.name || "-"} />
  </main>;
}
