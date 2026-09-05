"use client";

import { useState } from "react";
import { ConfirmModal, Toast } from "./ui";

type Format = "image" | "text" | "both";
type Schedule = { id: string; name: string; enabled: boolean; days: string; time: string; broadcastFormat?: Format };
const dayNames: Record<string, string> = { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" };
const formatNames: Record<Format, string> = { image: "Gambar", text: "Teks", both: "Gambar + teks" };

export function ScheduleManager({ initial, masterEnabled }: { initial: Schedule[]; masterEnabled: boolean }) {
  const [items] = useState(initial);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [master, setMaster] = useState(masterEnabled);
  const [pending, setPending] = useState<{ title: string; message: string; run: () => void } | null>(null);

  async function call(body: unknown) {
    try {
      const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      setFailed(!response.ok);
      setNote(data.message ?? data.error ?? (response.ok ? "Aksi berhasil dilakukan" : "Terjadi kesalahan"));
      if (response.ok) setTimeout(() => location.reload(), 1100);
    } catch { setFailed(true); setNote("Tidak dapat terhubung ke server"); }
  }
  async function toggleMaster() {
    const next = !master;
    try {
      const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleEnabled: next }) });
      const data = await response.json().catch(() => ({}));
      setFailed(!response.ok);
      setNote(data.message ?? data.error ?? (response.ok ? "Pengaturan jadwal diperbarui" : "Terjadi kesalahan"));
      if (response.ok) setMaster(next);
    } catch { setFailed(true); setNote("Tidak dapat terhubung ke server"); }
  }

  return <>
    <section className="card"><div className="card-head"><div><h2>Jadwal tersimpan</h2><span className="muted" style={{ fontSize: 12 }}>Setiap jadwal mengirim semua kategori yang dicentang pada level aktif.</span></div><div className="actions"><button className={`switch ${master ? "on" : ""}`} onClick={() => setPending({ title: "Konfirmasi jadwal utama", message: `${master ? "Nonaktifkan" : "Aktifkan"} semua jadwal broadcast?`, run: toggleMaster })} title="Aktif/nonaktif semua jadwal" /><button className="btn btn-primary" onClick={() => setOpen(true)}>+ Tambah jadwal</button></div></div>
      <div className="card-body">{!master && <div className="hint">Semua jadwal sedang dinonaktifkan dari kontrol utama.</div>}{!items.length ? <div className="empty">Belum ada jadwal broadcast.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Status</th><th>Nama</th><th>Hari</th><th>Waktu</th><th>Format</th><th>Target</th><th>Aksi</th></tr></thead><tbody>{items.map((schedule) => <tr key={schedule.id}><td><button className={`switch ${schedule.enabled ? "on" : ""}`} onClick={() => setPending({ title: "Konfirmasi jadwal", message: `${schedule.enabled ? "Nonaktifkan" : "Aktifkan"} jadwal ${schedule.name}?`, run: () => call({ action: "toggle", id: schedule.id, enabled: !schedule.enabled }) })} /></td><td><b>{schedule.name}</b></td><td>{schedule.days.split(",").map((day) => dayNames[day] ?? day).join(", ")}</td><td><span className="tag">{schedule.time} WIB</span></td><td>{formatNames[schedule.broadcastFormat ?? "image"]}</td><td>Semua kategori pilihan</td><td><button className="mini-btn" onClick={() => setPending({ title: "Hapus jadwal", message: `Hapus jadwal ${schedule.name}?`, run: () => call({ action: "delete", id: schedule.id }) })}>Hapus</button></td></tr>)}</tbody></table></div>}</div>
    </section>
    {note && <Toast message={note} tone={failed ? "error" : "success"} />}
    {pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const run = pending.run; setPending(null); run(); }}>Ya, lanjutkan</button></div></ConfirmModal>}
    {open && <ScheduleForm close={() => setOpen(false)} submit={call} />}
  </>;
}

function ScheduleForm({ close, submit }: { close: () => void; submit: (body: unknown) => void }) {
  const [days, setDays] = useState(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const [broadcastFormat, setBroadcastFormat] = useState<Format>("image");
  return <ConfirmModal title="Konfirmasi tambah jadwal" onClose={close}><div className="card-body"><label className="field">Nama jadwal<input id="schedule-name" defaultValue="Broadcast harian" /></label><label className="field">Waktu<input id="schedule-time" type="time" defaultValue="09:00" /></label><label className="field">Format broadcast<select value={broadcastFormat} onChange={(event) => setBroadcastFormat(event.target.value as Format)}>{Object.entries(formatNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label><div className="field">Hari pengiriman<div className="checkbox-list">{Object.entries(dayNames).map(([id, label]) => <label className="check-pill" key={id}><input type="checkbox" checked={days.includes(id)} onChange={(event) => setDays((current) => event.target.checked ? [...current, id] : current.filter((day) => day !== id))} /> {label}</label>)}</div></div><div className="hint">Worker VPS akan menyiarkan semua kategori yang dicentang pada level aktif.</div></div><div className="modal-actions"><button className="btn btn-ghost" onClick={close}>Batal</button><button className="btn btn-primary" onClick={() => submit({ action: "create", name: (document.getElementById("schedule-name") as HTMLInputElement).value, time: (document.getElementById("schedule-time") as HTMLInputElement).value, days, enabled: true, broadcastFormat })}>Ya, simpan jadwal</button></div></ConfirmModal>;
}
