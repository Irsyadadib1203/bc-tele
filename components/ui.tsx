"use client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function Toast({ message, tone = "success" }: { message: string; tone?: "success" | "error" }) {
  return <div className={`toast ${tone}`}>{tone === "success" ? "✓" : "!"} {message}</div>;
}

export function FlashNotice() {
  const params = useSearchParams();
  const notice = params.get("notice");
  if (!notice) return null;
  return <Toast message={notice} />;
}

async function responseMessage(response: Response) {
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, message: data.message || data.error || (response.ok ? "Aksi berhasil dilakukan" : "Aksi gagal dilakukan") };
}
export function ApiButton({
  children,
  url,
  method = "POST",
  body,
  className = "btn btn-primary",
  onSuccess,
  confirm = true,
  confirmTitle = "Konfirmasi aksi",
  confirmMessage = "Apakah Anda yakin ingin melanjutkan?",
}: {
  children: React.ReactNode;
  url: string;
  method?: string;
  body?: unknown;
  className?: string;
  onSuccess?: (data: any) => void;
  confirm?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Aksi gagal dilakukan");
      setFailed(false);
      setNote(d.message || "Aksi berhasil dilakukan");
      onSuccess?.(d);
      setTimeout(() => setNote(""), 2800);
    } catch (e) {
      setFailed(true);
      setNote(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {note && <Toast message={note} tone={failed ? "error" : "success"} />}
      <button className={className} onClick={() => confirm ? setConfirming(true) : run()} disabled={busy}>
        {busy ? "Memproses..." : children}
      </button>
      {confirming && <ConfirmModal title={confirmTitle} onClose={() => !busy && setConfirming(false)}>
        <div className="card-body"><p style={{ margin: 0 }}>{confirmMessage}</p></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Batal</button><button className="btn btn-primary" onClick={() => { setConfirming(false); run(); }} disabled={busy}>{busy ? "Memproses..." : "Ya, lanjutkan"}</button></div>
      </ConfirmModal>}
    </>
  );
}

export function ConfirmedForm({
  action,
  children,
  className,
  confirmTitle = "Konfirmasi penyimpanan",
  confirmMessage = "Simpan perubahan ini?",
  redirectTo,
}: {
  action: string;
  children: React.ReactNode;
  className?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [failed, setFailed] = useState(false);

  function requestConfirmation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForm(event.currentTarget);
    setConfirming(true);
  }
  async function submit() {
    if (!form) return;
    setBusy(true);
    try {
      const result = await responseMessage(await fetch(action, { method: "POST", headers: { Accept: "application/json" }, body: new FormData(form) }));
      setFailed(!result.ok);
      setNote(result.message);
      setConfirming(false);
      if (result.ok) {
        if (redirectTo) window.location.assign(redirectTo);
        else router.refresh();
      }
    } catch {
      setFailed(true);
      setNote("Tidak dapat terhubung ke server");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }
  return <>
    <form action={action} method="post" className={className} onSubmit={requestConfirmation}>{children}</form>
    {note && <Toast message={note} tone={failed ? "error" : "success"} />}
    {confirming && <ConfirmModal title={confirmTitle} onClose={() => !busy && setConfirming(false)}><div className="card-body"><p style={{ margin: 0 }}>{confirmMessage}</p></div><div className="modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Batal</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Menyimpan..." : "Ya, simpan"}</button></div></ConfirmModal>}
  </>;
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
