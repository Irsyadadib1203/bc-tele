import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";

const DEFAULT_DESIGN = {
  headerTitle: "PRICE UPDATE",
  primaryColor: "#5B5BD6",
  accentColor: "#A78BFA",
};

function color(value: FormDataEntryValue | null, fallback: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : fallback;
}

export async function POST(request: Request) {
  if (!(await currentUserId())) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const form = await request.formData();
  const levelId = form.get("levelId");
  if (typeof levelId !== "string" || !levelId) {
    return NextResponse.json({ error: "Level harga belum dipilih" }, { status: 400 });
  }
  const level = await db.priceLevel.findUnique({ where: { id: levelId } });
  if (!level) return NextResponse.json({ error: "Level harga tidak ditemukan" }, { status: 404 });

  const title = typeof form.get("headerTitle") === "string"
    ? String(form.get("headerTitle")).trim().slice(0, 255)
    : "";
  await db.priceLevel.update({
    where: { id: levelId },
    data: {
      headerTitle: title || DEFAULT_DESIGN.headerTitle,
      primaryColor: color(form.get("primaryColor"), DEFAULT_DESIGN.primaryColor),
      accentColor: color(form.get("accentColor"), DEFAULT_DESIGN.accentColor),
    },
  });
  await db.activityLog.create({
    data: { type: "SETTINGS", message: `Desain header level ${level.name} diperbarui` },
  });
  return NextResponse.json({ message: `Desain header level ${level.name} berhasil disimpan` });
}
