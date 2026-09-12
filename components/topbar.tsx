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
  const normalizedTheme = theme === "dark" ? "dark" : "light";
  const [activeTheme, setActiveTheme] = useState<"dark" | "light">(normalizedTheme);
  const [themeSaving, setThemeSaving] = useState(false);
  useEffect(() => {
    setActiveTheme(normalizedTheme);
    document.documentElement.dataset.theme = normalizedTheme;
    document.body.dataset.theme = normalizedTheme;
  }, [normalizedTheme]);
  const [menuOpen, setMenuOpen] = useState(false),
    [add, setAdd] = useState(false),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const closeMenu = () => setMenuOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("close-mobile-menu", closeMenu);
    document.body.classList.toggle("menu-open", menuOpen);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("close-mobile-menu", closeMenu);
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);
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
  async function changeTheme() {
    if (themeSaving) return;
    const previous = activeTheme;
    const next = previous === "dark" ? "light" : "dark";
    setThemeSaving(true);
    setActiveTheme(next);
    document.documentElement.dataset.theme = next;
    document.body.dataset.theme = next;
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal mengubah tampilan");
      setFailed(false);
      setNote(`Mode ${next === "dark" ? "dark" : "light"} aktif`);
      setTimeout(() => setNote(""), 2200);
      router.refresh();
    } catch (error) {
      setActiveTheme(previous);
      document.documentElement.dataset.theme = previous;
      document.body.dataset.theme = previous;
      setFailed(true);
      setNote(error instanceof Error ? error.message : "Tidak dapat mengubah tampilan");
    } finally {
      setThemeSaving(false);
    }
  }
  async function selectLevel(id: string) {
    if (id === selectedLevelId) return;
    try {
      const r = await fetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "select", id }) });
      const d = await r.json().catch(() => ({}));
      setFailed(!r.ok);
      setNote(d.message || d.error || (r.ok ? "Level harga dipilih" : "Gagal memilih level harga"));
      // The selected level is a server-side setting used by every panel page.
      // A full reload guarantees all page-specific server data (including
      // Telegram captions and selected categories) is fetched for the new
      // level instead of retaining a client-side route segment.
      if (r.ok) window.location.reload();
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  return (
    <>
      <header className="topbar">
        <div className="topbar-navigation">
          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
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
            <button className="round-add" onClick={() => setAdd(true)} aria-label="Tambah level harga">
              +
            </button>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn btn-ghost" onClick={() => void changeTheme()} disabled={themeSaving}>
            {themeSaving ? "Mengubah..." : activeTheme === "dark" ? "☀ Light" : "◐ Dark"}
          </button>
          <ApiButton url="/api/products/sync" className="btn btn-primary" confirm={false} onSuccess={() => router.refresh()}>Refresh semua level</ApiButton>
        </div>
      </header>
      <button className="mobile-nav-backdrop" type="button" aria-label="Tutup menu navigasi" onClick={() => setMenuOpen(false)} />
      {note && <Toast message={note} tone={failed ? "error" : "success"} />}
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
