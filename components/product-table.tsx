"use client";
import { useMemo, useState } from "react";
import { ConfirmModal, Toast } from "./ui";
import { priceWithSellerFee, type FeeConfiguration } from "@/lib/fee";
import { formatWibDownloadDateTime } from "@/lib/time";
type Category = {
  id: string;
  title: string;
  type: string | null;
  selected: boolean;
  prefixFilterEnabled: boolean;
  excludedPrefixes: string | null;
  productCount: number;
  products: any[];
};
export function ProductTable({
  categories,
  levelName,
  feeConfiguration,
}: {
  categories: Category[];
  levelName: string;
  feeConfiguration: FeeConfiguration;
}) {
  const [list, setList] = useState(categories);
  const [term, setTerm] = useState("");
  const [preview, setPreview] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState<{ title: string; message: string; run: () => void } | null>(null);
  const filtered = useMemo(
    () =>
      list.filter((c) => c.title.toLowerCase().includes(term.toLowerCase())),
    [list, term],
  );
  async function save(id: string, changes: Partial<Category>) {
    try {
      const r = await fetch("/api/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setFailed(true);
        setNote(d.error || "Gagal menyimpan pengaturan kategori");
        return;
      }
      setList((xs) => xs.map((x) => (x.id === id ? { ...x, ...changes } : x)));
      setFailed(false);
      setNote(d.message || "Pengaturan kategori disimpan");
      setTimeout(() => setNote(""), 2200);
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  function download(c: Category) {
    const visible = c.products.filter(
      (p: any) =>
        !c.prefixFilterEnabled ||
        !(c.excludedPrefixes || "")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .some((x) => String(p.product_code).toLowerCase().startsWith(x)),
    );
    const prices = visible.map(
      (p: any) =>
        `${p.product_code} - Rp ${new Intl.NumberFormat("id-ID").format(priceWithSellerFee(Number(p.product_price), feeConfiguration, p))}`,
    );
    const text = [
      `DAFTAR HARGA - [${levelName}]`,
      `Update : ${formatWibDownloadDateTime(new Date())}`,
      "",
      `# Kategori - [${c.title}]`,
      "",
      ...prices,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${c.title.replace(/[^a-z0-9]/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setFailed(false);
    setNote(`File daftar harga ${c.title} berhasil diunduh`);
    setTimeout(() => setNote(""), 2200);
  }
  async function broadcast(c: Category, format: "image" | "text" = "image") {
    try {
      const r = await fetch("/api/broadcast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: c.id, format }) });
      const d = await r.json().catch(() => ({}));
      setFailed(!r.ok);
      setNote(r.ok ? d.message || "Broadcast berhasil dikirim" : d.error || "Broadcast gagal");
      setTimeout(() => setNote(""), 3500);
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  return (
    <>
      <section className="card">
        <div className="card-head">
          <h2>Katalog level: {levelName}</h2>
          <span className="tag">{list.length} kategori</span>
        </div>
        <div className="card-body">
          <div className="toolbar">
            <label className="field">
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Cari kategori..."
              />
            </label>
            <span className="muted">
              Centang kolom BC untuk memasukkan kategori ke broadcast.
            </span>
          </div>
          {!list.length ? (
            <div className="empty">
              Belum ada produk. Konfigurasikan API lalu klik Refresh produk
              manual di Dashboard.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>BC</th>
                    <th>Nama kategori</th>
                    <th>Jumlah produk</th>
                    <th>Filter awalan (prefix)</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={(e) =>
                            setPending({ title: "Konfirmasi kategori broadcast", message: `${e.target.checked ? "Masukkan" : "Keluarkan"} kategori ${c.title} ${e.target.checked ? "ke" : "dari"} daftar broadcast?`, run: () => save(c.id, { selected: e.target.checked }) })
                          }
                        />
                      </td>
                      <td>
                        <div className="category-name">{c.title}</div>
                        <span className="tag off">{c.type || "produk"}</span>
                      </td>
                      <td>
                        <b>{c.productCount}</b> produk
                      </td>
                      <td>
                        <div className="prefix-cell">
                          <button
                            className={`switch ${c.prefixFilterEnabled ? "on" : ""}`}
                            aria-label="Aktifkan filter prefix"
                            onClick={() => setPending({ title: "Konfirmasi filter prefix", message: `${c.prefixFilterEnabled ? "Nonaktifkan" : "Aktifkan"} filter prefix untuk ${c.title}?`, run: () => save(c.id, { prefixFilterEnabled: !c.prefixFilterEnabled }) })}
                          />
                          <input
                            className="prefix-input"
                            disabled={!c.prefixFilterEnabled}
                            defaultValue={c.excludedPrefixes || ""}
                            placeholder="ffm, ffmx"
                            onBlur={(e) => e.target.value !== (c.excludedPrefixes || "") && setPending({ title: "Konfirmasi daftar prefix", message: `Simpan perubahan prefix yang dikecualikan untuk ${c.title}?`, run: () => save(c.id, { excludedPrefixes: e.target.value }) })}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="mini-btn"
                            onClick={() => setPreview(c)}
                          >
                            Preview
                          </button>
                          <button
                            className="mini-btn send"
                            onClick={() => setPending({ title: "Konfirmasi broadcast gambar", message: `Kirim gambar daftar harga kategori ${c.title} ke Telegram sekarang?`, run: () => broadcast(c, "image") })}
                          >
                            BC Gambar
                          </button>
                          <button
                            className="mini-btn send"
                            onClick={() => setPending({ title: "Konfirmasi broadcast teks", message: `Kirim teks daftar harga kategori ${c.title} ke Telegram sekarang?`, run: () => broadcast(c, "text") })}
                          >
                            BC Teks
                          </button>
                          <button
                            className="mini-btn"
                            onClick={() => setPending({ title: "Konfirmasi unduhan", message: `Unduh daftar harga ${c.title} dalam format TXT?`, run: () => download(c) })}
                          >
                            TXT
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      {note && <Toast message={note} tone={failed ? "error" : "success"} />}
      {pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const run = pending.run; setPending(null); run(); }}>Ya, lanjutkan</button></div></ConfirmModal>}
      {preview && (
        <ConfirmModal
          title={`Preview — ${preview.title}`}
          onClose={() => setPreview(null)}
        >
          <div className="card-body">
            <BroadcastPreview category={preview} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>
              Tutup
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setPending({ title: "Konfirmasi broadcast gambar", message: `Kirim gambar daftar harga kategori ${preview.title} ke Telegram sekarang?`, run: () => broadcast(preview, "image") })}
            >
              Kirim sekarang
            </button>
          </div>
        </ConfirmModal>
      )}
    </>
  );
}
function BroadcastPreview({ category }: { category: Category }) {
  return (
    <div className="broadcast-image-preview">
      <img
        alt={`Preview broadcast ${category.title}`}
        src={`/api/broadcast/preview?categoryId=${encodeURIComponent(category.id)}&at=${Date.now()}`}
      />
    </div>
  );
}
