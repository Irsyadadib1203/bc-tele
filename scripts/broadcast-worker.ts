import { broadcastCategories, type BroadcastFormat } from "../lib/broadcast";
import { sendCustomBroadcast } from "../lib/custom-broadcast";
import { db, pool } from "../lib/mysql";
import { syncSelectedLevel } from "../lib/product-sync";

const POLL_MS = Math.max(5_000, Number(process.env.SCHEDULE_POLLING_MS || 15_000));
let running = false;
let lastProductSyncAt = 0;

async function syncProductsWhenDue(settings: any) {
  const intervalMinutes = Math.max(1, Number(settings?.pollingInterval) || 15);
  if (Date.now() - lastProductSyncAt < intervalMinutes * 60_000) return;
  lastProductSyncAt = Date.now();
  try {
    const result = await syncSelectedLevel(settings);
    console.log(`Product sync complete: ${result.productCount} products, ${result.automaticBroadcasts} price-change broadcasts.`);
  } catch (error) {
    console.error("Automatic product sync failed:", error);
  }
}

function jakartaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const days: Record<string, string> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
  return { day: days[value("weekday")], time: `${value("hour")}:${value("minute")}`, key: `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}` };
}

async function runSchedule(schedule: any, settings: any) {
  if (!settings.botToken || !settings.targetChatId) {
    await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} tidak dijalankan: koneksi Telegram belum lengkap.` } });
    return;
  }
  if (schedule.broadcastFormat === "custom") {
    const custom = typeof schedule.customBroadcastId === "string" ? await db.customBroadcast.findUnique({ where: { id: schedule.customBroadcastId } }) : null;
    if (!custom) {
      await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} tidak dijalankan: BC custom tidak ditemukan.` } });
      return;
    }
    await db.activityLog.create({ data: { type: "SCHEDULE", message: `Jadwal ${schedule.name} mengirim BC custom ${custom.name}.` } });
    try {
      await sendCustomBroadcast(custom, settings);
      await db.activityLog.create({ data: { type: "SCHEDULE", message: `Jadwal ${schedule.name} selesai mengirim BC custom.` } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kesalahan worker tidak diketahui";
      await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} gagal mengirim BC custom: ${message}` } });
    }
    return;
  }
  // New schedules pin their price level. The global active level is used only
  // for legacy schedules created before levelId was introduced.
  const levelId = typeof schedule.levelId === "string"
    ? schedule.levelId
    : typeof settings.selectedLevelId === "string"
      ? settings.selectedLevelId
      : null;
  const categories = levelId ? (await db.productCategory.findMany({ where: { levelId } })).filter((category: any) => category.selected) : [];
  if (!categories.length) {
    await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} tidak dijalankan: belum ada kategori pilihan pada level aktif.` } });
    return;
  }
  const selectedFormat = schedule.broadcastFormat === "text" || schedule.broadcastFormat === "both" ? schedule.broadcastFormat : "image";
  const formats: BroadcastFormat[] = selectedFormat === "both" ? ["image", "text"] : [selectedFormat];
  await db.activityLog.create({ data: { type: "SCHEDULE", message: `Jadwal ${schedule.name} dimulai (${selectedFormat}) untuk ${categories.length} kategori.` } });
  for (const format of formats) {
    const result = await broadcastCategories(categories, settings, format);
    if (result.failed.length) await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} (${format}) selesai dengan ${result.failed.length} kegagalan.` } });
  }
  await db.activityLog.create({ data: { type: "SCHEDULE", message: `Jadwal ${schedule.name} selesai dikirim.` } });
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const settings = await db.settings.findUnique();
    await syncProductsWhenDue(settings);
    if (!settings?.scheduleEnabled) return;
    const now = jakartaNow();
    const schedules = await db.broadcastSchedule.findMany();
    for (const schedule of schedules) {
      if (!schedule.enabled || schedule.time !== now.time || !String(schedule.days).split(",").includes(now.day) || schedule.lastRunKey === now.key) continue;
      // Mark first so a restart or the next polling pass cannot send the same schedule twice in one minute.
      await db.broadcastSchedule.update({ where: { id: schedule.id }, data: { lastRunKey: now.key } });
      try {
        await runSchedule(schedule, settings);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kesalahan worker tidak diketahui";
        await db.activityLog.create({ data: { type: "ERROR", message: `Jadwal ${schedule.name} gagal: ${message}` } });
        console.error(`Schedule ${schedule.id} failed:`, error);
      }
    }
  } catch (error) {
    console.error("Broadcast scheduler tick failed:", error);
  } finally {
    running = false;
  }
}

console.log(`BC josjis scheduler started (polling every ${POLL_MS / 1000} seconds).`);
void tick();
const timer = setInterval(() => void tick(), POLL_MS);

async function shutdown() {
  clearInterval(timer);
  await pool.end();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
