"use client";
import { useMemo, useState } from "react";
import { ConfirmModal, Toast } from "./ui";
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
}: {
  categories: Category[];
  levelName: string;
}) {
  const [list, setList] = useState(categories);
  const [term, setTerm] = useState("");
  const [preview, setPreview] = useState<Category | null>(null);
  const [note, setNote] = useState("");
  const filtered = useMemo(
    () =>
      list.filter((c) => c.title.toLowerCase().includes(term.toLowerCase())),
    [list, term],
  );
  async function save(id: string, changes: Partial<Category>) {
    const r = await fetch("/api/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    const d = await r.json();
    if (!r.ok) {
      setNote(d.error || "Gagal menyimpan");
      return;
    }
    setList((xs) => xs.map((x) => (x.id === id ? { ...x, ...changes } : x)));
    setNote("Pengaturan kategori disimpan");
    setTimeout(() => setNote(""), 1800);
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
    const text = visible
      .map(
        (p: any) =>
          `${p.product_name} (${p.product_code}) - ${new Intl.NumberFormat("id-ID").format(p.product_price)}`,
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${c.title.replace(/[^a-z0-9]/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function broadcast(c: Category) {
    const r = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: c.id }),
    });
    const d = await r.json();
    setNote(r.ok ? d.message : d.error || "Broadcast gagal");
    setTimeout(() => setNote(""), 3000);
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
                            save(c.id, { selected: e.target.checked })
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
                            onClick={() =>
                              save(c.id, {
                                prefixFilterEnabled: !c.prefixFilterEnabled,
                              })
                            }
                          />
                          <input
                            className="prefix-input"
                            disabled={!c.prefixFilterEnabled}
                            defaultValue={c.excludedPrefixes || ""}
                            placeholder="ffm, ffmx"
                            onBlur={(e) =>
                              save(c.id, { excludedPrefixes: e.target.value })
                            }
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
                            onClick={() => broadcast(c)}
                          >
                            BC
                          </button>
                          <button
                            className="mini-btn"
                            onClick={() => download(c)}
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
      {note && <Toast message={note} />}{" "}
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
              onClick={() => broadcast(preview)}
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
  const prefixes = (category.excludedPrefixes || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  const products = category.products
    .filter(
      (p: any) =>
        !category.prefixFilterEnabled ||
        !prefixes.some((x) =>
          String(p.product_code).toLowerCase().startsWith(x),
        ),
    )
    .slice(0, 8);
  return (
    <div className="preview">
      <span className="tag" style={{ background: "#ffffff28", color: "#fff" }}>
        PRICE UPDATE
      </span>
      <h3>{category.title}</h3>
      <p style={{ opacity: 0.8, marginTop: 4 }}>Harga terbaru hari ini</p>
      <div className="product-list">
        {products.map((p: any) => (
          <div key={p.product_id}>
            <span>{p.product_name}</span>
            <b>Rp {new Intl.NumberFormat("id-ID").format(p.product_price)}</b>
          </div>
        ))}
        {!products.length && <div>Tidak ada produk untuk ditampilkan</div>}
      </div>
    </div>
  );
}
