import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/auth";
import { ConfirmedForm } from "@/components/ui";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  if (await currentUserId()) redirect("/dashboard");
  const { error, notice } = await searchParams;
  return (
    <main className="auth-shell">
      <section className="login-card">
        <div className="logo">
          <span className="logo-mark">✦</span>BC josjis
        </div>
        <div className="eyebrow" style={{ marginTop: 34 }}>
          Telegram broadcaster
        </div>
        <h1>Selamat datang kembali</h1>
        <p className="muted">
          Masuk untuk mengelola katalog dan broadcast produk Anda.
        </p>
        <ConfirmedForm action="/api/auth/login" redirectTo="/dashboard?notice=Login+berhasil" confirmTitle="Konfirmasi masuk" confirmMessage="Masuk ke dashboard dengan akun ini?">
          <label className="field">
            Username
            <input name="username" required placeholder="Masukkan username" />
          </label>
          <label className="field">
            Password
            <input
              name="password"
              type="password"
              required
              placeholder="Masukkan password"
            />
          </label>
          {error && <p style={{ color: "#d7395c", fontSize: 12 }}>{error}</p>}
          {notice && <p style={{ color: "#16875b", fontSize: 12 }}>{notice}</p>}
          <button className="btn btn-primary" type="submit">
            Masuk ke dashboard →
          </button>
        </ConfirmedForm>
        <div className="hint">
          Akun awal: <b>admin</b> / <b>admin123</b>. Ubah password akun ini
          lewat database setelah login.
        </div>
      </section>
    </main>
  );
}
