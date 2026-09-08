import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";

export async function POST(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const form = await request.formData();
  const levelId = form.get("levelId");
  if (typeof levelId !== "string" || !levelId) return NextResponse.json({ error: "Level harga belum dipilih" }, { status: 400 });
  const level = await db.priceLevel.findUnique({ where: { id: levelId } });
  if (!level) return NextResponse.json({ error: "Level harga tidak ditemukan" }, { status: 404 });

  const data: Record<string, string | null> = {};
  if (typeof form.get("caption") === "string") data.caption = String(form.get("caption")).trim().slice(0, 10_000) || null;
  if (typeof form.get("imageCaption") === "string") data.imageCaption = String(form.get("imageCaption")).trim().slice(0, 10_000) || null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Caption tidak ditemukan" }, { status: 400 });

  await db.priceLevel.update({ where: { id: levelId }, data });
  await db.activityLog.create({ data: { type: "SETTINGS", message: `Pengaturan BC level ${level.name} diperbarui` } });
  return NextResponse.json({ message: `Pengaturan BC level ${level.name} berhasil disimpan` });
}
