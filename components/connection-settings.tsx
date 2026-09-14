"use client";
import { useState } from "react";
import { ConfirmModal, ConfirmedForm, Toast } from "./ui";
type TargetGroup = "main" | "personal" | "both";
type Level = {
  id: string; name: string; apiKey: string | null;
  targetMainChatId: string | null; targetPersonalChatId: string | null;
  priceChangeTargetGroup: TargetGroup | null;
  priceTextTargetGroup: TargetGroup | null;
  priceImageTargetGroup: TargetGroup | null;
} | null;
const targetOptions: { value: TargetGroup; label: string }[] = [
  { value: "main", label: "Chat utama" },
  { value: "personal", label: "Chat pribadi" },
  { value: "both", label: "Chat utama dan pribadi" },
];
export function ConnectionSettings({
  level,
  botToken,
}: {
  level: Level;
  botToken: string;
}) {
  const [name, setName] = useState(level?.name || ""),
    [apiKey, setApiKey] = useState(level?.apiKey || ""),
    [targetMainChatId, setTargetMainChatId] = useState(level?.targetMainChatId || ""),
    [targetPersonalChatId, setTargetPersonalChatId] = useState(level?.targetPersonalChatId || ""),
    [priceChangeTargetGroup, setPriceChangeTargetGroup] = useState<TargetGroup>(level?.priceChangeTargetGroup || "main"),
    [priceTextTargetGroup, setPriceTextTargetGroup] = useState<TargetGroup>(level?.priceTextTargetGroup || "main"),
    [priceImageTargetGroup, setPriceImageTargetGroup] = useState<TargetGroup>(level?.priceImageTargetGroup || "main"),
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
                Target chat utama untuk {level.name}
                <textarea value={targetMainChatId} onChange={(e) => setTargetMainChatId(e.target.value)} rows={4} placeholder={"-1001234567890\n@namachannel"} />
              </label>
              <label className="field">
                Target chat pribadi untuk {level.name}
                <textarea value={targetPersonalChatId} onChange={(e) => setTargetPersonalChatId(e.target.value)} rows={4} placeholder={"123456789\n987654321"} />
              </label>
              <p className="muted">Satu ID per baris. Kedua daftar ini hanya digunakan oleh broadcast dan jadwal pada level ini.</p>
              <div className="field">
                Aturan tujuan broadcast
                <div className="checkbox-list">
                  <BroadcastTargetRule label="BC perubahan harga otomatis" value={priceChangeTargetGroup} onChange={setPriceChangeTargetGroup} />
                  <BroadcastTargetRule label="BC harga teks" value={priceTextTargetGroup} onChange={setPriceTextTargetGroup} />
                  <BroadcastTargetRule label="BC harga gambar" value={priceImageTargetGroup} onChange={setPriceImageTargetGroup} />
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => setPending({ title: "Konfirmasi level", message: "Simpan perubahan nama level, API key, target chat, dan aturan broadcast ini?", body: { action: "update", id: level.id, name, apiKey, targetMainChatId, targetPersonalChatId, priceChangeTargetGroup, priceTextTargetGroup, priceImageTargetGroup } })}
              >
                Simpan level & API key
              </button>
              <button
                className="btn btn-danger"
                style={{ marginTop: 20, marginLeft: 10 }}
                onClick={() => setPending({ title: "Hapus level harga", message: `Hapus level ${level.name}? Produk pada level ini juga akan terhapus. BC custom dan jadwal harus dihapus terlebih dahulu.`, body: { action: "delete", id: level.id } })}
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

function BroadcastTargetRule({ label, value, onChange }: { label: string; value: TargetGroup; onChange: (value: TargetGroup) => void }) {
  return <label className="field" style={{ margin: 0 }}>{label}<select value={value} onChange={(event) => onChange(event.target.value as TargetGroup)}>{targetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
