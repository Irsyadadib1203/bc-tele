import { db } from "@/lib/mysql";
import { ApiButton, ConfirmedForm } from "@/components/ui";
import { CustomBroadcastManager } from "@/components/custom-broadcast-manager";

export default async function TelegramPage() {
  const settings = await db.settings.findUnique();
  const selectedCategories = typeof settings?.selectedLevelId === "string"
    ? (await db.productCategory.findMany({ where: { levelId: settings.selectedLevelId } })).filter((category: any) => category.selected)
    : [];
  const customBroadcasts = await db.customBroadcast.findMany();
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Kirim Telegram</h1><p className="page-subtitle">Pengaturan broadcast gambar dan teks dipisahkan agar lebih jelas.</p></div></div>
    <section className="broadcast-group"><div className="broadcast-group-title"><span>Broadcast harga</span><p>Pesan yang dibuat dari katalog harga produk.</p></div><section className="card broadcast-selected-card"><div><h2>Kirim kategori pilihan</h2><p className="muted">{selectedCategories.length ? `${selectedCategories.length} kategori yang dicentang di Produk siap dikirim.` : "Belum ada kategori yang dicentang di Produk."}</p></div><div className="actions"><ApiButton url="/api/broadcast" body={{ selected: true, format: "image" }} className="btn btn-primary" confirmTitle="Konfirmasi broadcast gambar" confirmMessage={`Kirim broadcast gambar untuk ${selectedCategories.length} kategori yang dipilih?`}>Kirim semua gambar</ApiButton><ApiButton url="/api/broadcast" body={{ selected: true, format: "text" }} className="btn btn-ghost" confirmTitle="Konfirmasi broadcast teks" confirmMessage={`Kirim broadcast teks untuk ${selectedCategories.length} kategori yang dipilih?`}>Kirim semua teks</ApiButton></div></section>
    <div className="setting-grid">
      <ConfirmedForm action="/api/settings" className="card setting-card" confirmTitle="Konfirmasi format gambar" confirmMessage="Simpan caption dan gunakan format broadcast gambar?"><h2>Broadcast gambar</h2><p className="muted">Kirim kartu harga PNG. Warna dan desain header dapat diatur di halaman Desain Header.</p><input type="hidden" name="broadcastFormat" value="image" /><label className="field">Caption gambar<textarea name="imageCaption" rows={8} defaultValue={settings?.imageCaption || "<b>{category}</b>\nHarga terbaru tersedia.\nJumlah produk: {count}"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> dan <b>{"{count}"}</b>. Caption akan dikirim bersama gambar PNG.</p><button className="btn btn-primary" style={{ marginTop: 20 }}>Simpan & gunakan format gambar</button></ConfirmedForm>
      <ConfirmedForm action="/api/settings" className="card setting-card" confirmTitle="Konfirmasi format teks" confirmMessage="Simpan caption dan gunakan format broadcast teks?"><h2>Broadcast teks</h2><p className="muted">Caption ini muncul sebelum daftar harga. Mendukung HTML Telegram.</p><input type="hidden" name="broadcastFormat" value="text" /><label className="field">Caption broadcast<textarea name="caption" rows={8} defaultValue={settings?.caption || "<b>{category} - FFZ STORE</b>\n✅ Speed 1 - 2 detik\n✅ Open 24 jam anti cutoff"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> untuk kategori dan <b>{"{count}"}</b> untuk jumlah produk.</p><button className="btn btn-primary" style={{ marginTop: 20 }}>Simpan & gunakan format teks</button></ConfirmedForm>
    </div></section>
    <CustomBroadcastManager initial={customBroadcasts} />
  </main>;
}
