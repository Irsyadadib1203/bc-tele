import { db as prisma } from "@/lib/mysql";
import { ConfirmedForm } from "@/components/ui";
import { formatWibDateTime } from "@/lib/time";
export default async function Dashboard() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const level = settings?.selectedLevelId
    ? await prisma.priceLevel.findUnique({
        where: { id: settings.selectedLevelId },
      })
    : await prisma.priceLevel.findFirst({ orderBy: { createdAt: "asc" } });
  const [rawCategories, rawLogs, levels] = await Promise.all([
    level
      ? prisma.productCategory.findMany({ where: { levelId: level.id } })
      : [],
    prisma.activityLog.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    prisma.priceLevel.findMany(),
  ]);
  const categories: any[] = rawCategories,
    logs: any[] = rawLogs,
    selected = categories.filter((c) => c.selected).length,
    productCount = categories.reduce((n, c) => n + c.productCount, 0),
    configuredLevels = levels.filter((item: any) => typeof item.apiKey === "string" && item.apiKey.trim()).length,
    configured = !!process.env.PRODUCTS_SITE_URL && configuredLevels > 0;
  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Selamat datang, Admin</h1>
          <p className="page-subtitle">
            Ringkasan katalog dan aktivitas broadcaster Anda.
          </p>
        </div>
      </div>
      <section className="grid-4">
        <Metric
          icon="◎"
          label="LEVEL TERPILIH"
          value={level?.name || "Belum ada"}
          extra="Konteks katalog saat ini"
        />
        <Metric
          icon="▦"
          label="TOTAL KATEGORI"
          value={String(categories.length)}
          extra="Dari sinkronisasi terakhir"
        />
        <Metric
          icon="◈"
          label="TOTAL PRODUK"
          value={productCount.toLocaleString("id-ID")}
          extra="Produk aktif tersedia"
        />
        <Metric
          icon="✓"
          label="KATEGORI PILIHAN BC"
          value={String(selected)}
          extra="Siap dikirim ke Telegram"
        />
      </section>
      <section className="split">
        <article className="card">
          <div className="card-head">
            <h2>Sinkronisasi produk</h2>
            <span className="tag">{settings?.pollingInterval || 15} menit</span>
          </div>
          <div className="card-body">
            <p className="muted" style={{ marginTop: 0 }}>
              Semua level yang sudah memiliki API key akan diperbarui otomatis dengan interval ini.
            </p>
            <ConfirmedForm action="/api/settings" className="inline-fields" confirmTitle="Konfirmasi interval" confirmMessage="Simpan interval pengambilan produk yang baru?">
              <label className="field">
                Interval get produk
                <select
                  name="pollingInterval"
                  defaultValue={settings?.pollingInterval || 15}
                >
                  {[1, 2, 3, 4, 5, 10, 15, 30, 45, 60].map((n) => (
                    <option key={n} value={n}>
                      {n === 60 ? "1 jam" : `${n} menit`}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary">Simpan interval</button>
            </ConfirmedForm>
            <div style={{ marginTop: 18 }}>
              {configured ? (
                <div className="sync-row">
                  <span className="sync-dot" />
                  <div>
                    <b>Auto refresh siap untuk {configuredLevels} level</b>
                    <div className="muted">
                      Site URL disimpan aman di backend.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sync-row">
                  <span style={{ color: "#d8992d" }}>●</span>
                  <div>
                    <b>API belum dikonfigurasi</b>
                    <div className="muted">
                      Isi PRODUCTS_SITE_URL di .env dan API Key pada setiap
                      level yang ingin diperbarui otomatis.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>
        <article className="card">
          <div className="card-head">
            <h2>Aktivitas terbaru</h2>
            <a href="/activity" className="muted">
              Lihat semua
            </a>
          </div>
          <div className="card-body">
            {logs.length ? (
              logs.map((log: any) => (
                <div className="sync-row" key={log.id}>
                  <span
                    className="sync-dot"
                    style={{
                      background: log.type === "ERROR" ? "#e74c70" : "#5b5bd6",
                    }}
                  />
                  <div>
                    <b>{log.message}</b>
                    <div className="muted">
                      {formatWibDateTime(log.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">Belum ada aktivitas.</div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
function Metric({
  icon,
  label,
  value,
  extra,
}: {
  icon: string;
  label: string;
  value: string;
  extra: string;
}) {
  return (
    <article className="card metric">
      <span className="metric-icon">{icon}</span>
      <div className="metric-label">{label}</div>
      <div
        className="metric-value"
        style={{ fontSize: value.length > 13 ? 22 : 31 }}
      >
        {value}
      </div>
      <span className="muted">{extra}</span>
    </article>
  );
}
