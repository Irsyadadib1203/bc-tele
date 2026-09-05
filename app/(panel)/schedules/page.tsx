import { ScheduleManager } from "@/components/schedule-manager";
import { db } from "@/lib/mysql";

export default async function SchedulesPage() {
  const [settings, schedules] = await Promise.all([db.settings.findUnique(), db.broadcastSchedule.findMany()]);
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Jadwal Broadcast</h1><p className="page-subtitle">Kirim semua kategori yang dipilih secara otomatis pada waktu tertentu.</p></div></div><ScheduleManager initial={schedules} masterEnabled={settings?.scheduleEnabled ?? true} /><p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Worker scheduler berjalan di VPS dan mengecek jadwal setiap 15 detik dalam waktu WIB. Targetnya selalu kategori yang dicentang pada level aktif saat jadwal berjalan.</p></main>;
}
