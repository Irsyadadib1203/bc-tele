import { NextResponse } from "next/server";
import { db } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
export async function POST(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { action, id, name, time, days, enabled, broadcastFormat } =
    await req.json();
  if (action === "create") {
    if (!time || !days?.length)
      return NextResponse.json(
        { error: "Waktu dan hari harus diisi" },
        { status: 400 },
      );
    if (!["image", "text", "both"].includes(broadcastFormat))
      return NextResponse.json({ error: "Format broadcast tidak valid" }, { status: 400 });
    await db.broadcastSchedule.create({
      data: {
        name: name || "Jadwal broadcast",
        time,
        days: days.join(","),
        categoryIds: "",
        broadcastFormat,
        enabled: !!enabled,
      },
    });
    return NextResponse.json({ message: "Jadwal broadcast ditambahkan" });
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
