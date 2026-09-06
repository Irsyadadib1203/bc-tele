import { db as prisma } from "@/lib/mysql";
import { formatWibDateTime } from "@/lib/time";
export default async function Activity() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">
            Riwayat sinkronisasi, pengiriman, dan perubahan pengaturan.
          </p>
        </div>
      </div>
      <section className="card">
        <div className="card-head">
          <h2>{logs.length} aktivitas terbaru</h2>
        </div>
        <div className="card-body">
          {logs.length ? (
            logs.map((log: any) => (
              <div className="log-item" key={log.id}>
                <span
                  className="log-point"
                  style={{
                    background:
                      log.type === "ERROR"
                        ? "#e74c70"
                        : log.type === "BROADCAST"
                          ? "#24b47e"
                          : log.type === "SYNC"
                            ? "#24b47e"
                            : "#5b5bd6",
                  }}
                />
                <div>
                  <b>{log.message}</b>
                  <div className="muted" style={{ marginTop: 3 }}>
                    {log.type}
                  </div>
                </div>
                <span className="log-time">
                  {formatWibDateTime(log.createdAt)}
                </span>
              </div>
            ))
          ) : (
            <div className="empty">Belum ada aktivitas yang dicatat.</div>
          )}
        </div>
      </section>
    </main>
  );
}
