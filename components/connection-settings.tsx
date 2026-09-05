"use client";
import { useState } from "react";
import { Toast } from "./ui";
type Level = { id: string; name: string; apiKey: string | null } | null;
export function ConnectionSettings({
  level,
  botToken,
  targetChatId,
}: {
  level: Level;
  botToken: string;
  targetChatId: string;
}) {
  const [name, setName] = useState(level?.name || ""),
    [apiKey, setApiKey] = useState(level?.apiKey || ""),
    [note, setNote] = useState("");
  async function api(url: string, body: any) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setNote(d.message || d.error || "Gagal");
    if (r.ok) setTimeout(() => location.reload(), 500);
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
              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() =>
                  api("/api/levels", {
                    action: "update",
                    id: level.id,
                    name,
                    apiKey,
                  })
                }
              >
                Simpan level & API key
              </button>
              <button
                className="btn btn-danger"
                style={{ marginTop: 20, marginLeft: 10 }}
                onClick={() =>
                  confirm(
                    `Hapus level ${level.name}? Produk level ini juga akan terhapus.`,
                  ) && api("/api/levels", { action: "delete", id: level.id })
                }
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
        <form
          action="/api/settings"
          method="post"
          className="card setting-card"
        >
          <h2>Bot Telegram</h2>
          <p className="muted">
            Pastikan bot menjadi admin apabila target adalah channel.
          </p>
          <label className="field">
            Bot token
            <input
              name="botToken"
              type="password"
              defaultValue={botToken}
              placeholder="123456:ABC-DEF..."
            />
          </label>
          <label className="field">
            Target chat / channel ID
            <input
              name="targetChatId"
              defaultValue={targetChatId}
              placeholder="-1001234567890 atau @namachannel"
            />
          </label>
          <button className="btn btn-primary" style={{ marginTop: 20 }}>
            Simpan koneksi Telegram
          </button>
        </form>
      </div>
      {note && <Toast message={note} />}
    </>
  );
}
