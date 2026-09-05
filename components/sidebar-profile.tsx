"use client";

import { useState } from "react";
import { ConfirmModal, Toast } from "./ui";

export function SidebarProfile({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);

  async function logout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: { Accept: "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal keluar dari akun");
      window.location.assign("/login?notice=Anda+berhasil+keluar");
    } catch (error) {
      setFailed(true);
      setNote(error instanceof Error ? error.message : "Gagal keluar dari akun");
    }
  }

  return <>
    <div className="sidebar-bot-status"><span>●</span> Bot online</div>
    <button className="sidebar-user" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Buka menu profil">
      <span className="avatar">{username[0].toUpperCase()}</span>
      <span className="sidebar-user-copy"><b>{username}</b><small>Administrator</small></span>
      <span className="profile-chevron">⌄</span>
    </button>
    {open && <div className="profile-menu" role="menu"><div className="profile-menu-head"><span className="avatar">{username[0].toUpperCase()}</span><div><b>{username}</b><small>Administrator</small></div></div><button className="profile-logout" role="menuitem" onClick={() => { setOpen(false); setConfirming(true); }}>↪ Keluar</button></div>}
    {confirming && <ConfirmModal title="Konfirmasi keluar" onClose={() => setConfirming(false)}><div className="card-body"><p style={{ margin: 0 }}>Akhiri sesi dan keluar dari dashboard?</p></div><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setConfirming(false)}>Batal</button><button className="btn btn-danger" onClick={() => { setConfirming(false); logout(); }}>Ya, keluar</button></div></ConfirmModal>}
    {note && <Toast message={note} tone={failed ? "error" : "success"} />}
  </>;
}
