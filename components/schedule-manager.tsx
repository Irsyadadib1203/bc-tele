"use client";

import { useState } from "react";
import type { CustomBroadcast } from "./custom-broadcast-manager";
import { ConfirmModal, Toast } from "./ui";

type PriceFormat = "image" | "text" | "both";
type Schedule = {
  id: string; name: string; enabled: boolean; days: string; time: string;
  broadcastFormat?: PriceFormat | "custom"; levelId?: string | null; customBroadcastId?: string | null;
};
type PriceLevel = { id: string; name: string };
const dayNames: Record<string, string> = { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" };
const priceFormatNames: Record<PriceFormat, string> = { image: "Gambar harga", text: "Teks harga", both: "Gambar + teks harga" };

export function ScheduleManager({ initial, masterEnabled, customBroadcasts, levels, defaultLevelId, levelId }: { initial: Schedule[]; masterEnabled: boolean; customBroadcasts: CustomBroadcast[]; levels: PriceLevel[]; defaultLevelId: string | null; levelId: string | null }) {
  const [items] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
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
      if (!levelId) return;
      const response = await fetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateScheduleEnabled", id: levelId, enabled: next }) });
      const data = await response.json().catch(() => ({}));
      setFailed(!response.ok);
      setNote(data.message ?? data.error ?? (response.ok ? "Pengaturan jadwal diperbarui" : "Terjadi kesalahan"));
      if (response.ok) setMaster(next);
    } catch { setFailed(true); setNote("Tidak dapat terhubung ke server"); }
  }

  return <>
    <section className="card">
      <div className="card-head">
        <div><h2>Jadwal tersimpan</h2><span className="muted" style={{ fontSize: 12 }}>Jadwal dapat mengirim broadcast harga atau satu BC custom.</span></div>
        <div className="actions">
          <button className={`switch ${master ? "on" : ""}`} onClick={toggleMaster} title="Aktif/nonaktif semua jadwal" />
          <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Tambah jadwal</button>
        </div>
      </div>
      <div className="card-body">
        {!master && <div className="hint">Semua jadwal sedang dinonaktifkan dari kontrol utama.</div>}
        {!items.length ? <div className="empty">Belum ada jadwal broadcast.</div> : <ScheduleRows items={items} customBroadcasts={customBroadcasts} levels={levels} confirm={setPending} call={call} edit={setEditing} />}
      </div>
    </section>
    {note && <Toast message={note} tone={failed ? "error" : "success"} />}
    {pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const run = pending.run; setPending(null); run(); }}>Ya, lanjutkan</button></div></ConfirmModal>}
    {open && <ScheduleForm close={() => setOpen(false)} submit={call} customBroadcasts={customBroadcasts} levels={levels} defaultLevelId={defaultLevelId} />}
    {editing && <ScheduleForm initial={editing} close={() => setEditing(null)} submit={call} customBroadcasts={customBroadcasts} levels={levels} defaultLevelId={defaultLevelId} />}
  </>;
}

function ScheduleRows({ items, customBroadcasts, levels, confirm, call, edit }: { items: Schedule[]; customBroadcasts: CustomBroadcast[]; levels: PriceLevel[]; confirm: (value: { title: string; message: string; run: () => void }) => void; call: (body: unknown) => void; edit: (schedule: Schedule) => void }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Status</th><th>Nama</th><th>Hari</th><th>Waktu</th><th>Format</th><th>Target</th><th>Aksi</th></tr></thead><tbody>{items.map((schedule) => {
    const custom = schedule.broadcastFormat === "custom" ? customBroadcasts.find((item) => item.id === schedule.customBroadcastId) : null;
    const level = schedule.broadcastFormat === "custom" ? null : levels.find((item) => item.id === schedule.levelId);
    const format = custom ? `BC custom — ${custom.name}` : schedule.broadcastFormat === "custom" ? "BC custom dihapus" : priceFormatNames[schedule.broadcastFormat ?? "image"];
    return <tr key={schedule.id}>
      <td><button className={`switch ${schedule.enabled ? "on" : ""}`} onClick={() => call({ action: "toggle", id: schedule.id, enabled: !schedule.enabled })} /></td>
      <td><b>{schedule.name}</b></td><td>{schedule.days.split(",").map((day) => dayNames[day] ?? day).join(", ")}</td><td><span className="tag">{schedule.time} WIB</span></td><td>{format}</td><td>{schedule.broadcastFormat === "custom" ? "Pesan custom" : level ? `${level.name} · kategori pilihan` : "Level belum dipilih (jadwal lama)"}</td>
      <td><div className="actions"><button className="mini-btn" onClick={() => edit(schedule)}>Edit</button><button className="mini-btn" onClick={() => confirm({ title: "Hapus jadwal", message: `Hapus jadwal ${schedule.name}?`, run: () => call({ action: "delete", id: schedule.id }) })}>Hapus</button></div></td>
    </tr>;
  })}</tbody></table></div>;
}

function ScheduleForm({ close, submit, customBroadcasts, levels, defaultLevelId, initial }: { close: () => void; submit: (body: unknown) => void; customBroadcasts: CustomBroadcast[]; levels: PriceLevel[]; defaultLevelId: string | null; initial?: Schedule }) {
  const [name, setName] = useState(initial?.name ?? "Broadcast harian");
  const [time, setTime] = useState(initial?.time ?? "09:00");
  const [days, setDays] = useState(initial?.days ? initial.days.split(",").filter((day) => day in dayNames) : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const [broadcastFormat, setBroadcastFormat] = useState(initial?.broadcastFormat === "custom" && initial.customBroadcastId ? `custom:${initial.customBroadcastId}` : initial?.broadcastFormat ?? "image");
  const [levelId, setLevelId] = useState(initial?.levelId && levels.some((level) => level.id === initial.levelId) ? initial.levelId : defaultLevelId && levels.some((level) => level.id === defaultLevelId) ? defaultLevelId : levels[0]?.id ?? "");
  const isCustom = broadcastFormat.startsWith("custom:");
  return <ConfirmModal title={initial ? "Edit jadwal broadcast" : "Konfirmasi tambah jadwal"} onClose={close}><div className="card-body"><label className="field">Nama jadwal<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="field">Waktu<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label className="field">Format broadcast<select value={broadcastFormat} onChange={(event) => setBroadcastFormat(event.target.value)}><optgroup label="Broadcast harga">{Object.entries(priceFormatNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</optgroup><optgroup label="BC custom">{customBroadcasts.map((item) => <option value={`custom:${item.id}`} key={item.id}>{item.name}</option>)}</optgroup></select></label><div className="hint">Level jadwal: <b>{levels[0]?.name || "-"}</b></div><div className="field">Hari pengiriman<div className="checkbox-list">{Object.entries(dayNames).map(([id, label]) => <label className="check-pill" key={id}><input type="checkbox" checked={days.includes(id)} onChange={(event) => setDays((current) => event.target.checked ? [...current, id] : current.filter((day) => day !== id))} /> {label}</label>)}</div></div><div className="hint">{isCustom ? "Worker akan mengirim pesan BC custom yang dipilih untuk level ini." : "Worker akan menyiarkan kategori pilihan dari level ini."}</div></div><div className="modal-actions"><button className="btn btn-ghost" onClick={close}>Batal</button><button className="btn btn-primary" disabled={!levelId || !days.length} onClick={() => submit({ action: initial ? "update" : "create", id: initial?.id, name, time, days, enabled: initial?.enabled ?? true, broadcastFormat, levelId })}>Ya, simpan jadwal</button></div></ConfirmModal>;
}
