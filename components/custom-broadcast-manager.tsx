"use client";

import { useState } from "react";
import { ConfirmModal, Toast } from "./ui";

export type CustomBroadcast = { id: string; levelId: string; name: string; content: string };

export function CustomBroadcastManager({ initial, levelId, levelName }: { initial: CustomBroadcast[]; levelId: string | null; levelName: string }) {
  const [items, setItems] = useState(initial);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{ title: string; message: string; run: () => void } | null>(null);

  async function call(body: Record<string, unknown>) {
    const response = await fetch("/api/custom-broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Aksi BC custom gagal");
    return data;
  }

  async function save(item: CustomBroadcast) {
    try {
      const data = await call({ action: "update", ...item, levelId });
      setFailed(false);
      setNote(data.message);
    } catch (error) {
      setFailed(true);
      setNote(error instanceof Error ? error.message : "Gagal menyimpan BC custom");
    }
  }

  async function send(item: CustomBroadcast) {
    try {
      const data = await call({ action: "send", id: item.id, levelId });
      setFailed(false);
      setNote(data.message);
    } catch (error) {
      setFailed(true);
      setNote(error instanceof Error ? error.message : "Gagal mengirim BC custom");
    }
  }

  async function remove(item: CustomBroadcast) {
    try {
      const data = await call({ action: "delete", id: item.id, levelId });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setFailed(false);
      setNote(data.message);
    } catch (error) {
      setFailed(true);
      setNote(error instanceof Error ? error.message : "Gagal menghapus BC custom");
    }
  }

  return <>
    <section className="broadcast-group custom-broadcast-group">
      <div className="broadcast-group-title"><span>Broadcast custom — {levelName}</span><p>Pesan bebas ini hanya tersedia dan dikirim untuk level ini.</p></div>
      <div className="custom-broadcast-list">
        {items.map((item) => <CustomBroadcastCard key={item.id} item={item} canDelete onChange={(next) => setItems((current) => current.map((entry) => entry.id === next.id ? next : entry))} onSave={save} onSend={send} onDelete={() => setPending({ title: "Konfirmasi hapus BC custom", message: `Hapus BC custom ${item.name}? Jadwal yang menggunakannya tidak akan dapat dikirim.`, run: () => remove(item) })} />)}
      </div>
      <button className="btn btn-ghost" style={{ marginTop: 16 }} disabled={!levelId} onClick={() => setAdding(true)}>+ Tambah BC custom</button>
    </section>
    {note && <Toast message={note} tone={failed ? "error" : "success"} />}
    {pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-danger" onClick={() => { const run = pending.run; setPending(null); void run(); }}>Ya, hapus</button></div></ConfirmModal>}
    {adding && <AddCustomBroadcast onClose={() => setAdding(false)} onCreate={async (name, content) => { try { const data = await call({ action: "create", levelId, name, content }); setItems((current) => [...current, data.item]); setAdding(false); setFailed(false); setNote(data.message); } catch (error) { setFailed(true); setNote(error instanceof Error ? error.message : "Gagal menambahkan BC custom"); } }} />}
  </>;
}

function CustomBroadcastCard({ item, canDelete, onChange, onSave, onSend, onDelete }: { item: CustomBroadcast; canDelete: boolean; onChange: (item: CustomBroadcast) => void; onSave: (item: CustomBroadcast) => void; onSend: (item: CustomBroadcast) => void; onDelete: () => void }) {
  return <article className="card custom-broadcast-card">
    <label className="field">Nama BC custom<input value={item.name} maxLength={100} onChange={(event) => onChange({ ...item, name: event.target.value })} /></label>
    <label className="field">Isi pesan<textarea value={item.content} rows={8} maxLength={4096} placeholder="Tulis pesan Telegram di sini..." onChange={(event) => onChange({ ...item, content: event.target.value })} /></label>
    <p className="muted custom-broadcast-help">Mendukung HTML Telegram. Maksimal 4.096 karakter.</p>
    <div className="actions custom-broadcast-actions"><button className="btn btn-primary" onClick={() => void onSave(item)}>Simpan</button><button className="btn btn-ghost" onClick={() => void onSend(item)}>Kirim sekarang</button>{canDelete && <button className="mini-btn" onClick={onDelete}>Hapus</button>}</div>
  </article>;
}

function AddCustomBroadcast({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, content: string) => void }) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  return <ConfirmModal title="Tambah BC custom" onClose={onClose}><div className="card-body"><label className="field">Nama BC custom<input value={name} autoFocus maxLength={100} placeholder="Contoh: Promo akhir pekan" onChange={(event) => setName(event.target.value)} /></label><label className="field">Isi pesan<textarea value={content} rows={7} maxLength={4096} placeholder="Tulis pesan Telegram di sini..." onChange={(event) => setContent(event.target.value)} /></label></div><div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>Batal</button><button className="btn btn-primary" disabled={!name.trim()} onClick={() => onCreate(name, content)}>Tambah</button></div></ConfirmModal>;
}
