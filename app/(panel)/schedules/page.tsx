import { ScheduleManager } from "@/components/schedule-manager";
import { db } from "@/lib/mysql";

export default async function SchedulesPage() {
  const [settings, schedules, customBroadcasts] = await Promise.all([db.settings.findUnique(), db.broadcastSchedule.findMany(), db.customBroadcast.findMany()]);
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Jadwal Broadcast</h1><p className="page-subtitle">Kirim broadcast harga atau BC custom secara otomatis pada waktu tertentu.</p></div></div><ScheduleManager initial={schedules} masterEnabled={settings?.scheduleEnabled ?? true} customBroadcasts={customBroadcasts} /><p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Worker scheduler berjalan di VPS dan mengecek jadwal setiap 15 detik dalam waktu WIB. Jadwal harga menargetkan kategori yang dicentang pada level aktif; jadwal BC custom mengirim pesan yang dipilih.</p></main>;
}
