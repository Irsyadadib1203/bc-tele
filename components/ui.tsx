"use client";
import { useState } from "react";

export function Toast({ message }: { message: string }) {
  return <div className="toast">✓ {message}</div>;
}
export function ApiButton({
  children,
  url,
  method = "POST",
  body,
  className = "btn btn-primary",
  onSuccess,
}: {
  children: React.ReactNode;
  url: string;
  method?: string;
  body?: unknown;
  className?: string;
  onSuccess?: (data: any) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function run() {
    setBusy(true);
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNote(d.message || "Berhasil disimpan");
      onSuccess?.(d);
      setTimeout(() => setNote(""), 2800);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {note && <Toast message={note} />}
      <button className={className} onClick={run} disabled={busy}>
        {busy ? "Memproses..." : children}
      </button>
    </>
  );
}
export function ConfirmModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="card-head">
          <h2>{title}</h2>
          <button className="mini-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
