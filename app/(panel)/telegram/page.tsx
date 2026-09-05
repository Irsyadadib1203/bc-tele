import { db } from "@/lib/mysql";

export default async function TelegramPage() {
  const settings = await db.settings.findUnique();
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Kirim Telegram</h1><p className="page-subtitle">Pengaturan broadcast gambar dan teks dipisahkan agar lebih jelas.</p></div></div>
    <div className="setting-grid">
      <form action="/api/settings" method="post" className="card setting-card"><h2>Broadcast gambar</h2><p className="muted">Kirim kartu harga PNG. Warna dan desain header dapat diatur di halaman Desain Header.</p><input type="hidden" name="broadcastFormat" value="image" /><label className="field">Caption gambar<textarea name="imageCaption" rows={8} defaultValue={settings?.imageCaption || "<b>{category}</b>\nHarga terbaru tersedia.\nJumlah produk: {count}"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> dan <b>{"{count}"}</b>. Caption akan dikirim bersama gambar PNG.</p><button className="btn btn-primary" style={{ marginTop: 20 }}>Simpan & gunakan format gambar</button></form>
      <form action="/api/settings" method="post" className="card setting-card"><h2>Broadcast teks</h2><p className="muted">Caption ini muncul sebelum daftar harga. Mendukung HTML Telegram.</p><input type="hidden" name="broadcastFormat" value="text" /><label className="field">Caption broadcast<textarea name="caption" rows={8} defaultValue={settings?.caption || "<b>{category} - FFZ STORE</b>\n✅ Speed 1 - 2 detik\n✅ Open 24 jam anti cutoff"} /></label><p className="muted">Gunakan <b>{"{category}"}</b> untuk kategori dan <b>{"{count}"}</b> untuk jumlah produk.</p><button className="btn btn-primary" style={{ marginTop: 20 }}>Simpan & gunakan format teks</button></form>
    </div>
  </main>;
}
