"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiButton, ConfirmModal, Toast } from "./ui";
type Level = { id: string; name: string };
export function Topbar({
  levels,
  selectedLevelId,
  theme,
}: {
  levels: Level[];
  selectedLevelId: string | null;
  theme: string;
}) {
  const router = useRouter();
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);
  const [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [failed, setFailed] = useState(false),
    [confirm, setConfirm] = useState<{ title: string; message: string; run: () => void } | null>(null);
  async function call(url: string, body: unknown) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      setFailed(!r.ok);
      setNote(d.message || d.error || (r.ok ? "Aksi berhasil dilakukan" : "Aksi gagal dilakukan"));
      if (r.ok) setTimeout(() => location.reload(), 1100);
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  function changeTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    call("/api/settings", { theme: next });
  }
  async function selectLevel(id: string) {
    if (id === selectedLevelId) return;
    try {
      const r = await fetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "select", id }) });
      const d = await r.json().catch(() => ({}));
      setFailed(!r.ok);
      setNote(d.message || d.error || (r.ok ? "Level harga dipilih" : "Gagal memilih level harga"));
      if (r.ok) router.refresh();
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  return (
    <>
      <header className="topbar">
        <div className="levels">
          <span className="level-label">LEVEL HARGA</span>
          {levels.map((l) => (
            <button
              key={l.id}
              className={`level-tab ${l.id === selectedLevelId ? "active" : ""}`}
              onClick={() => selectLevel(l.id)}
            >
              {l.name}
            </button>
          ))}
          <button className="round-add" onClick={() => setAdd(true)}>
            +
          </button>
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={() => setConfirm({ title: "Ubah tampilan", message: "Terapkan perubahan tema tampilan?", run: changeTheme })}>
            {theme === "dark" ? "☀ Light" : "◐ Dark"}
          </button>
          <ApiButton url="/api/products/sync" className="btn btn-primary" confirmTitle="Konfirmasi sinkronisasi" confirmMessage="Ambil dan perbarui katalog produk dari API sekarang?">Refresh produk</ApiButton>
        </div>
      </header>
      {note && <Toast message={note} tone={failed ? "error" : "success"} />}
      {confirm && <ConfirmModal title={confirm.title} onClose={() => setConfirm(null)}><div className="card-body"><p style={{ margin: 0 }}>{confirm.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setConfirm(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const run = confirm.run; setConfirm(null); run(); }}>Ya, lanjutkan</button></div></ConfirmModal>}
      {add && (
        <ConfirmModal title="Konfirmasi tambah level harga" onClose={() => setAdd(false)}>
          <div className="card-body">
            <label className="field">
              Nama level
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Reseller"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setAdd(false)}>
              Batal
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!name.trim()) {
                  setFailed(true);
                  setNote("Nama level wajib diisi");
                  return;
                }
                call("/api/levels", { action: "create", name });
              }}
            >
              Tambah level
            </button>
          </div>
        </ConfirmModal>
      )}
    </>
  );
}
