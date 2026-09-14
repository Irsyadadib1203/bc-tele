import { ScheduleManager } from "@/components/schedule-manager";
import { CustomBroadcastManager } from "@/components/custom-broadcast-manager";
import { db } from "@/lib/mysql";

export default async function SchedulesPage() {
  const settings = await db.settings.findUnique();
  const level = typeof settings?.selectedLevelId === "string" ? await db.priceLevel.findUnique({ where: { id: settings.selectedLevelId } }) : await db.priceLevel.findFirst();
  const [schedules, customBroadcasts] = level ? await Promise.all([db.broadcastSchedule.findMany({ where: { levelId: level.id } }), db.customBroadcast.findMany({ where: { levelId: level.id } })]) : [[], []];
  return <main className="main"><div className="page-head"><div><h1 className="page-title">Jadwal & BC Custom</h1><p className="page-subtitle">Seluruh BC custom dan jadwal pada halaman ini hanya berlaku untuk level {level?.name || "yang dipilih"}.</p></div></div><CustomBroadcastManager initial={customBroadcasts} levelId={level?.id ?? null} levelName={level?.name || "-"} /><ScheduleManager initial={schedules} masterEnabled={level?.scheduleEnabled ?? true} customBroadcasts={customBroadcasts} levels={level ? [level] : []} defaultLevelId={level?.id ?? null} levelId={level?.id ?? null} targetRules={level ?? {}} /><p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Worker scheduler berjalan di VPS dan mengecek jadwal setiap 15 detik dalam waktu WIB. Jadwal harga mengikuti aturan tujuan formatnya; jadwal BC custom mengikuti tujuan BC custom tersebut.</p></main>;
}
