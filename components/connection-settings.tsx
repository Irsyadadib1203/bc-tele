"use client";
import { useState } from "react";
import { ConfirmModal, ConfirmedForm, Toast } from "./ui";
type Level = { id: string; name: string; apiKey: string | null; targetChatId: string | null } | null;
export function ConnectionSettings({
  level,
  botToken,
}: {
  level: Level;
  botToken: string;
}) {
  const [name, setName] = useState(level?.name || ""),
    [apiKey, setApiKey] = useState(level?.apiKey || ""),
    [targetChatId, setTargetChatId] = useState(level?.targetChatId || ""),
    [note, setNote] = useState(""),
    [failed, setFailed] = useState(false),
    [pending, setPending] = useState<{ title: string; message: string; body: unknown } | null>(null);
  async function api(url: string, body: any) {
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      setFailed(!r.ok);
      setNote(d.message || d.error || (r.ok ? "Aksi berhasil dilakukan" : "Aksi gagal dilakukan"));
      if (r.ok) setTimeout(() => location.reload(), 500);
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    }
  }
  return (
    <>
      <div className="setting-grid">
        <section className="card setting-card">
          <h2>Level yang dipilih</h2>
          <p className="muted">
            Level dipilih dari topbar. Masing-masing memiliki API key sendiri.
          </p>
          {level ? (
            <>
              <label className="field">
                Nama level
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="field">
                API key untuk {level.name}
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Masukkan API key level ini"
                />
              </label>
              <label className="field">
                Target chat / channel untuk {level.name}
                <textarea value={targetChatId} onChange={(e) => setTargetChatId(e.target.value)} rows={4} placeholder={"-1001234567890\n@namachannel"} />
              </label>
              <p className="muted">Target Telegram hanya digunakan oleh BC dan jadwal pada level ini.</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => setPending({ title: "Konfirmasi level", message: "Simpan perubahan nama level, API key, dan target Telegram ini?", body: { action: "update", id: level.id, name, apiKey, targetChatId } })}
              >
                Simpan level & API key
              </button>
              <button
                className="btn btn-danger"
                style={{ marginTop: 20, marginLeft: 10 }}
                onClick={() => setPending({ title: "Hapus level harga", message: `Hapus level ${level.name}? Produk pada level ini juga akan terhapus.`, body: { action: "delete", id: level.id } })}
              >
                Hapus level ini
              </button>
            </>
          ) : (
            <div className="empty">
              Buat level harga dari tombol + di topbar.
            </div>
          )}
        </section>
        <ConfirmedForm action="/api/settings" className="card setting-card" confirmTitle="Konfirmasi koneksi Telegram" confirmMessage="Simpan konfigurasi bot Telegram ini?">
          <h2>Bot Telegram</h2>
          <p className="muted">Token bot digunakan bersama; target chat diatur terpisah pada setiap level. Pastikan bot menjadi admin apabila target adalah channel.</p>
          <label className="field">
            Bot token
            <input
              name="botToken"
              type="password"
              defaultValue={botToken}
              placeholder="123456:ABC-DEF..."
            />
          </label>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>
            Simpan koneksi Telegram
          </button>
        </ConfirmedForm>
      </div>
      {note && <Toast message={note} tone={failed ? "error" : "success"} />}
      {pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const body = pending.body; setPending(null); api("/api/levels", body); }}>Ya, lanjutkan</button></div></ConfirmModal>}
    </>
  );
}
