"use client";

import { useState } from "react";
import { ConfirmModal, Toast } from "./ui";

type Schedule = { id: string; name: string; enabled: boolean; days: string; time: string };

const dayNames: Record<string, string> = { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" };

export function ScheduleManager({ initial, masterEnabled }: { initial: Schedule[]; masterEnabled: boolean }) {
  const [items] = useState(initial);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [master, setMaster] = useState(masterEnabled);

  async function call(body: unknown) {
    const response = await fetch("/api/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setNote(data.message ?? data.error ?? "Terjadi kesalahan");
    if (response.ok) setTimeout(() => location.reload(), 350);
  }

  async function toggleMaster() {
    const next = !master;
    setMaster(next);
    const response = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleEnabled: next }) });
    const data = await response.json();
    setNote(data.message ?? data.error ?? "Terjadi kesalahan");
  }

  return <>
    <section className="card"><div className="card-head"><div><h2>Jadwal tersimpan</h2><span className="muted" style={{ fontSize: 12 }}>Setiap jadwal mengirim semua kategori yang dicentang untuk broadcast pada level aktif.</span></div><div className="actions"><button className={`switch ${master ? "on" : ""}`} onClick={toggleMaster} title="Aktif/nonaktif semua jadwal" /><button className="btn btn-primary" onClick={() => setOpen(true)}>+ Tambah jadwal</button></div></div>
      <div className="card-body">{!master && <div className="hint">Semua jadwal sedang dinonaktifkan dari kontrol utama.</div>}{!items.length ? <div className="empty">Belum ada jadwal broadcast.</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Status</th><th>Nama</th><th>Hari</th><th>Waktu</th><th>Target</th><th>Aksi</th></tr></thead><tbody>{items.map((schedule) => <tr key={schedule.id}><td><button className={`switch ${schedule.enabled ? "on" : ""}`} onClick={() => call({ action: "toggle", id: schedule.id, enabled: !schedule.enabled })} /></td><td><b>{schedule.name}</b></td><td>{schedule.days.split(",").map((day) => dayNames[day] ?? day).join(", ")}</td><td><span className="tag">{schedule.time} WIB</span></td><td>Semua kategori pilihan</td><td><button className="mini-btn" onClick={() => call({ action: "delete", id: schedule.id })}>Hapus</button></td></tr>)}</tbody></table></div>}</div>
    </section>
    {note && <Toast message={note} />}
    {open && <ScheduleForm close={() => setOpen(false)} submit={call} />}
  </>;
}

function ScheduleForm({ close, submit }: { close: () => void; submit: (body: unknown) => void }) {
  const [days, setDays] = useState(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  return <ConfirmModal title="Tambah jadwal broadcast" onClose={close}><div className="card-body"><label className="field">Nama jadwal<input id="schedule-name" defaultValue="Broadcast harian" /></label><label className="field">Waktu<input id="schedule-time" type="time" defaultValue="09:00" /></label><div className="field">Hari pengiriman<div className="checkbox-list">{Object.entries(dayNames).map(([id, label]) => <label className="check-pill" key={id}><input type="checkbox" checked={days.includes(id)} onChange={(event) => setDays((current) => event.target.checked ? [...current, id] : current.filter((day) => day !== id))} /> {label}</label>)}</div></div><div className="hint">Jadwal ini otomatis menyiarkan semua kategori yang dicentang pada halaman Produk.</div></div><div className="modal-actions"><button className="btn btn-ghost" onClick={close}>Batal</button><button className="btn btn-primary" onClick={() => submit({ action: "create", name: (document.getElementById("schedule-name") as HTMLInputElement).value, time: (document.getElementById("schedule-time") as HTMLInputElement).value, days, enabled: true })}>Simpan jadwal</button></div></ConfirmModal>;
}
