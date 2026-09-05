"use client";
import { useEffect, useState } from "react";
import { ConfirmModal, Toast } from "./ui";
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
  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);
  const [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [note, setNote] = useState("");
  async function call(url: string, body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setNote(d.message || d.error || "Gagal");
    if (r.ok) setTimeout(() => location.reload(), 350);
  }
  function changeTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.body.dataset.theme = next;
    call("/api/settings", { theme: next });
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
              onClick={() =>
                call("/api/levels", { action: "select", id: l.id })
              }
            >
              {l.name}
            </button>
          ))}
          <button className="round-add" onClick={() => setAdd(true)}>
            +
          </button>
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={changeTheme}>
            {theme === "dark" ? "☀ Light" : "◐ Dark"}
          </button>
          <span className="top-status">● Bot online</span>
          <form action="/api/auth/logout" method="post">
            <button className="btn btn-ghost">Keluar</button>
          </form>
        </div>
      </header>
      {note && <Toast message={note} />}{" "}
      {add && (
        <ConfirmModal title="Tambah level harga" onClose={() => setAdd(false)}>
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
              onClick={() =>
                name.trim() && call("/api/levels", { action: "create", name })
              }
            >
              Tambah level
            </button>
          </div>
        </ConfirmModal>
      )}
    </>
  );
}
