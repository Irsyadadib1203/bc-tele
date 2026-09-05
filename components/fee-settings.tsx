"use client";

import { useState } from "react";
import { normalizeFeeOverrides, type FeeOverride } from "@/lib/fee";
import { Toast } from "./ui";

type FeeSettingsProps = { level: { id: string; name: string; feeEnabled: boolean; feeSmall: number; feeMedium: number; feeLarge: number; feeOverrides?: FeeOverride[] } | null };

export function FeeSettings({ level }: FeeSettingsProps) {
  const [enabled, setEnabled] = useState(level?.feeEnabled ?? false);
  const [small, setSmall] = useState(String(level?.feeSmall ?? 5));
  const [medium, setMedium] = useState(String(level?.feeMedium ?? 10));
  const [large, setLarge] = useState(String(level?.feeLarge ?? 25));
  const [overrides, setOverrides] = useState(() => normalizeFeeOverrides(level?.feeOverrides));
  const [denom, setDenom] = useState("");
  const [overrideFee, setOverrideFee] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!level) return <div className="empty">Buat atau pilih level harga terlebih dahulu.</div>;
  const levelId = level.id;

  async function save() {
    setSaving(true);
    const response = await fetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateFee", id: levelId, feeEnabled: enabled, feeSmall: Number(small), feeMedium: Number(medium), feeLarge: Number(large), feeOverrides: overrides }) });
    const data = await response.json();
    setNote(data.message ?? data.error ?? "Gagal menyimpan fee");
    setSaving(false);
  }

  function addOverride() {
    const value = denom.trim();
    const fee = Number(overrideFee);
    if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isInteger(fee) || fee < 0) { setNote("Denom harus berupa angka dan fee harus bilangan bulat ≥ 0"); return; }
    setOverrides((current) => [...current.filter((item) => item.denom !== value), { denom: value, fee }]);
    setDenom(""); setOverrideFee("");
  }

  const tiers = [["TIER 1 (Kecil)", "Nominal ≤ Rp10.000", small, setSmall], ["TIER 2 (Menengah)", "Rp10.001 – Rp25.000", medium, setMedium], ["TIER 3 (Besar)", "Nominal > Rp25.000", large, setLarge]] as const;
  return <><section className="card fee-card"><div className="card-head"><div><h2>Fee Seller Berjenjang — Level {level.name}</h2><span className="muted">Pengaturan ini independen untuk level API key ini.</span></div><label className="fee-toggle">Aktifkan fee penyesuaian <button type="button" className={`switch ${enabled ? "on" : ""}`} onClick={() => setEnabled((value) => !value)} aria-label="Aktifkan fee penyesuaian" /></label></div><div className="card-body"><div className="hint fee-hint"><b>Skema fee seller</b><br />Harga API ≤ Rp10.000: tambah tier 1. Rp10.001–Rp25.000: tambah tier 2. Di atas Rp25.000: tambah tier 3.</div><div className="fee-tiers">{tiers.map(([title, rule, value, setValue]) => <label className="fee-tier" key={title}><span className="muted">{title}</span><b>{rule}</b><span className="fee-input"><small>+ Rp</small><input type="number" min="0" step="1" value={value} onChange={(event) => setValue(event.target.value)} /></span></label>)}</div><section className="fee-overrides"><h3>Override fee per denom</h3><p className="muted">Override selalu diprioritaskan daripada tier otomatis. Misalnya denom 82 dengan fee 10 tetap memakai +Rp10 walau harganya masuk tier 1.</p><div className="inline-fields"><label className="field"><span>Denom</span><input inputMode="numeric" value={denom} onChange={(event) => setDenom(event.target.value)} placeholder="Contoh: 82" /></label><label className="field"><span>Fee (Rp)</span><input type="number" min="0" value={overrideFee} onChange={(event) => setOverrideFee(event.target.value)} placeholder="Contoh: 10" /></label><button type="button" className="btn btn-ghost" onClick={addOverride}>Tambah override</button></div>{overrides.length > 0 && <div className="override-list">{overrides.map((item) => <span className="tag" key={item.denom}>Denom {item.denom}: +Rp{item.fee}<button type="button" onClick={() => setOverrides((current) => current.filter((value) => value.denom !== item.denom))}>×</button></span>)}</div>}</section><div className="fee-actions"><button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? "Menyimpan..." : "Simpan pengaturan fee level ini"}</button></div></div></section>{note && <Toast message={note} />}</>;
}
