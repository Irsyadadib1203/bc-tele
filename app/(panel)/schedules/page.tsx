import { ScheduleManager } from "@/components/schedule-manager";
import { db } from "@/lib/mysql";

export default async function SchedulesPage() {
  const settings = await db.settings.findUnique();
  const level = typeof settings?.selectedLevelId === "string" ? await db.priceLevel.findUnique({ where: { id: settings.selectedLevelId } }) : await db.priceLevel.findFirst();
  const [schedules, customBroadcasts] = level ? await Promise.all([db.broadcastSchedule.findMany({ where: { levelId: level.id } }), db.customBroadcast.findMany({ where: { levelId: level.id } })]) : [[], []];
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Jadwal Broadcast</h1><p className="page-subtitle">Jadwal pada halaman ini hanya berlaku untuk level {level?.name || "yang dipilih"}.</p></div></div><ScheduleManager initial={schedules} masterEnabled={level?.scheduleEnabled ?? true} customBroadcasts={customBroadcasts} levels={level ? [level] : []} defaultLevelId={level?.id ?? null} levelId={level?.id ?? null} /><p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Worker scheduler berjalan di VPS dan mengecek jadwal setiap 15 detik dalam waktu WIB. Jadwal harga dan BC custom selalu dikunci ke level ini.</p></main>;
}
