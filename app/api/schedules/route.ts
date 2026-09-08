import { NextResponse } from "next/server";
import { db } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
export async function POST(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { action, id, name, time, days, enabled, broadcastFormat, levelId } =
    await req.json();
  if (action === "create" || (action === "update" && id)) {
    if (!time || !Array.isArray(days) || !days.length)
      return NextResponse.json(
        { error: "Waktu dan hari harus diisi" },
        { status: 400 },
      );
    const customId =
      typeof broadcastFormat === "string" && broadcastFormat.startsWith("custom:")
        ? broadcastFormat.slice("custom:".length)
        : null;
    const isPriceFormat = ["image", "text", "both"].includes(broadcastFormat);
    if (!isPriceFormat && !customId)
      return NextResponse.json({ error: "Format broadcast tidak valid" }, { status: 400 });
    if (typeof levelId !== "string" || !(await db.priceLevel.findUnique({ where: { id: levelId } })))
      return NextResponse.json({ error: "Pilih level harga yang valid" }, { status: 400 });
    if (customId) {
      const custom = await db.customBroadcast.findUnique({ where: { id: customId } });
      if (!custom || custom.levelId !== levelId) return NextResponse.json({ error: "BC custom tidak ditemukan pada level ini" }, { status: 404 });
    }
    const data = {
      name: name || "Jadwal broadcast",
      time,
      days: days.join(","),
      broadcastFormat: customId ? "custom" : broadcastFormat,
      levelId,
      customBroadcastId: customId,
      enabled: !!enabled,
    };
    if (action === "create") {
      await db.broadcastSchedule.create({ data: { ...data, categoryIds: "" } });
      return NextResponse.json({ message: "Jadwal broadcast ditambahkan" });
    }
    const schedule = await db.broadcastSchedule.findUnique({ where: { id } });
    if (!schedule) return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
    await db.broadcastSchedule.update({ where: { id }, data });
    return NextResponse.json({ message: "Jadwal broadcast diperbarui" });
  }
  if (action === "toggle" && id) {
    await db.broadcastSchedule.update({
      where: { id },
      data: { enabled: !!enabled },
    });
    return NextResponse.json({
      message: enabled ? "Jadwal diaktifkan" : "Jadwal dinonaktifkan",
    });
  }
  if (action === "delete" && id) {
    await db.broadcastSchedule.delete({ where: { id } });
    return NextResponse.json({ message: "Jadwal dihapus" });
  }
  return NextResponse.json(
    { error: "Permintaan tidak valid" },
    { status: 400 },
  );
}
