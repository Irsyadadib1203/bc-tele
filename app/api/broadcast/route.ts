import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { broadcastCategories, type BroadcastFormat } from "@/lib/broadcast";
import { db } from "@/lib/mysql";

export async function POST(request: Request) {
  if (!(await currentUserId())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const body = (await request.json()) as { categoryId?: unknown; selected?: unknown; format?: unknown };
  const format: BroadcastFormat = body.format === "text" ? "text" : "image";
  const settings = await db.settings.findUnique();
  if (!settings?.botToken || !settings?.targetChatId) return NextResponse.json({ error: "Bot Token dan Target Chat ID harus dikonfigurasi." }, { status: 400 });

  let categories: any[] = [];
  if (typeof body.categoryId === "string") {
    const category = await db.productCategory.findUnique({ where: { id: body.categoryId } });
    if (category) categories = [category];
  } else if (body.selected === true) {
    const levelId = typeof settings.selectedLevelId === "string" ? settings.selectedLevelId : null;
    if (levelId) categories = (await db.productCategory.findMany({ where: { levelId } })).filter((category: any) => category.selected);
  }
  if (!categories.length) return NextResponse.json({ error: body.selected ? "Belum ada kategori yang dicentang untuk broadcast." : "Kategori tidak ditemukan." }, { status: 400 });

  const result = await broadcastCategories(categories, settings, format);
  const formatLabel = format === "text" ? "teks" : "gambar";
  if (result.failed.length) return NextResponse.json({ error: `${result.sent.length} kategori berhasil dikirim, ${result.failed.length} gagal. ${result.failed.join(" | ")}` }, { status: 502 });
  return NextResponse.json({ message: `Broadcast ${formatLabel} berhasil dikirim untuk ${result.sent.length} kategori: ${result.sent.join(", ")}` });
}
