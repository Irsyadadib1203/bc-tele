"use client";

import { useState } from "react";
import { normalizeFeeOverrides, type FeeOverride } from "@/lib/fee";
import { ConfirmModal, Toast } from "./ui";

type FeeSettingsProps = { level: { id: string; name: string; feeEnabled: boolean; feeSmall: number; feeMedium: number; feeLarge: number; feeOverrides?: FeeOverride[] } | null };

export function FeeSettings({ level }: FeeSettingsProps) {
  const [enabled, setEnabled] = useState(level?.feeEnabled ?? false);
  const [small, setSmall] = useState(String(level?.feeSmall ?? 5));
  const [medium, setMedium] = useState(String(level?.feeMedium ?? 10));
  const [large, setLarge] = useState(String(level?.feeLarge ?? 25));
  const [overrides, setOverrides] = useState(() => normalizeFeeOverrides(level?.feeOverrides));
  const [productCode, setProductCode] = useState("");
  const [overrideFee, setOverrideFee] = useState("");
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<{ title: string; message: string; run: () => void } | null>(null);

  if (!level) return <div className="empty">Buat atau pilih level harga terlebih dahulu.</div>;
  const levelId = level.id;

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/levels", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateFee", id: levelId, feeEnabled: enabled, feeSmall: Number(small), feeMedium: Number(medium), feeLarge: Number(large), feeOverrides: overrides }) });
      const data = await response.json().catch(() => ({}));
      setFailed(!response.ok);
      setNote(data.message ?? data.error ?? (response.ok ? "Pengaturan fee berhasil disimpan" : "Gagal menyimpan fee"));
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
    } finally {
      setSaving(false);
    }
  }

  function addOverride() {
    const value = productCode.trim().toUpperCase();
    const fee = Number(overrideFee);
    if (!/^[A-Z0-9][A-Z0-9 _-]*$/.test(value) || !Number.isInteger(fee) || fee < 0) { setFailed(true); setNote("Kode produk tidak valid dan fee harus bilangan bulat ≥ 0"); return; }
    setPending({ title: "Konfirmasi override fee", message: `Tambahkan override kode produk ${value} dengan fee Rp${fee}?`, run: () => { setOverrides((current) => [...current.filter((item) => item.productCode.replace(/[ _-]+/g, "") !== value.replace(/[ _-]+/g, "")), { productCode: value, fee }]); setProductCode(""); setOverrideFee(""); setFailed(false); setNote("Override fee ditambahkan. Simpan pengaturan untuk menerapkan perubahan."); } });
  }

  const tiers = [["TIER 1 (Kecil)", "Nominal ≤ Rp10.000", small, setSmall], ["TIER 2 (Menengah)", "Rp10.001 – Rp25.000", medium, setMedium], ["TIER 3 (Besar)", "Nominal > Rp25.000", large, setLarge]] as const;
  return <><section className="card fee-card"><div className="card-head"><div><h2>Fee Seller Berjenjang — Level {level.name}</h2><span className="muted">Pengaturan ini independen untuk level API key ini.</span></div><label className="fee-toggle">Aktifkan fee penyesuaian <button type="button" className={`switch ${enabled ? "on" : ""}`} onClick={() => setPending({ title: "Konfirmasi fee", message: `${enabled ? "Nonaktifkan" : "Aktifkan"} fee penyesuaian?`, run: () => { setEnabled((value) => !value); setFailed(false); setNote("Status fee diubah. Simpan pengaturan untuk menerapkan perubahan."); } })} aria-label="Aktifkan fee penyesuaian" /></label></div><div className="card-body"><div className="hint fee-hint"><b>Skema fee seller</b><br />Harga API ≤ Rp10.000: tambah tier 1. Rp10.001–Rp25.000: tambah tier 2. Di atas Rp25.000: tambah tier 3.</div><div className="fee-tiers">{tiers.map(([title, rule, value, setValue]) => <label className="fee-tier" key={title}><span className="muted">{title}</span><b>{rule}</b><span className="fee-input"><small>+ Rp</small><input type="number" min="0" step="1" value={value} onChange={(event) => setValue(event.target.value)} /></span></label>)}</div><section className="fee-overrides"><h3>Override fee per kode produk</h3><p className="muted">Override selalu diprioritaskan daripada tier otomatis. Masukkan kode produk, misalnya FF-5 atau FF-MM, untuk memakai fee khusus.</p><div className="inline-fields"><label className="field"><span>Kode produk</span><input value={productCode} onChange={(event) => setProductCode(event.target.value)} placeholder="Contoh: FF-5 atau FF-MM" autoCapitalize="characters" /></label><label className="field"><span>Fee (Rp)</span><input type="number" min="0" value={overrideFee} onChange={(event) => setOverrideFee(event.target.value)} placeholder="Contoh: 10" /></label><button type="button" className="btn btn-ghost" onClick={addOverride}>Tambah override</button></div>{overrides.length > 0 && <div className="override-list">{overrides.map((item) => <span className="tag" key={item.productCode}>Kode {item.productCode}: +Rp{item.fee}<button type="button" onClick={() => setPending({ title: "Hapus override fee", message: `Hapus override kode produk ${item.productCode}?`, run: () => { setOverrides((current) => current.filter((value) => value.productCode !== item.productCode)); setFailed(false); setNote("Override fee dihapus. Simpan pengaturan untuk menerapkan perubahan."); } })}>×</button></span>)}</div>}</section><div className="fee-actions"><button className="btn btn-primary" disabled={saving} onClick={() => setPending({ title: "Konfirmasi pengaturan fee", message: "Simpan seluruh perubahan pengaturan fee untuk level ini?", run: save })}>{saving ? "Menyimpan..." : "Simpan pengaturan fee level ini"}</button></div></div></section>{note && <Toast message={note} tone={failed ? "error" : "success"} />}{pending && <ConfirmModal title={pending.title} onClose={() => setPending(null)}><div className="card-body"><p style={{ margin: 0 }}>{pending.message}</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setPending(null)}>Batal</button><button className="btn btn-primary" onClick={() => { const run = pending.run; setPending(null); run(); }}>Ya, lanjutkan</button></div></ConfirmModal>}</>;
}
