import { NextResponse } from "next/server";
import { db } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
import { normalizeFeeOverrides } from "@/lib/fee";
import { telegramTargetChatIds } from "@/lib/telegram-targets";
export async function POST(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { action, id, name, apiKey, targetChatId, enabled, feeEnabled, feeSmall, feeMedium, feeLarge, feeOverrides } = await req.json();
  if (action === "create") {
    if (!name?.trim())
      return NextResponse.json(
        { error: "Nama level wajib diisi" },
        { status: 400 },
      );
    const settings = await db.settings.findUnique();
    const level = await db.priceLevel.create({
      data: { name: name.trim() },
    });
    if (!settings?.selectedLevelId)
      await db.settings.upsert({
        where: { id: 1 },
        update: { selectedLevelId: level.id },
        create: { id: 1, selectedLevelId: level.id },
      });
    return NextResponse.json({ message: "Level harga ditambahkan" });
  }
  if (action === "select" && id) {
    await db.settings.upsert({
      where: { id: 1 },
      update: { selectedLevelId: id },
      create: { id: 1, selectedLevelId: id },
    });
    return NextResponse.json({ message: "Level harga dipilih" });
  }
  if (action === "update" && id) {
    if (!name?.trim())
      return NextResponse.json(
        { error: "Nama level wajib diisi" },
        { status: 400 },
      );
    await db.priceLevel.update({
      where: { id },
      data: { name: name.trim(), apiKey: apiKey || null, targetChatId: telegramTargetChatIds({ targetChatId }).join("\n") || null },
    });
    return NextResponse.json({ message: "Level dan API key diperbarui" });
  }
  if (action === "updateFee" && id) {
    const fees = [feeSmall, feeMedium, feeLarge];
    if (!fees.every((fee) => Number.isInteger(fee) && fee >= 0 && fee <= 1_000_000)) return NextResponse.json({ error: "Nilai fee harus berupa bilangan bulat antara 0 dan 1.000.000" }, { status: 400 });
    const overrides = normalizeFeeOverrides(feeOverrides);
    if (overrides.length > 100) return NextResponse.json({ error: "Maksimal 100 override kode produk per level" }, { status: 400 });
    await db.priceLevel.update({ where: { id }, data: { feeEnabled: Boolean(feeEnabled), feeSmall, feeMedium, feeLarge, feeOverrides: overrides } });
    return NextResponse.json({ message: "Pengaturan fee berhasil disimpan" });
  }
  if (action === "updateScheduleEnabled" && id) {
    const level = await db.priceLevel.findUnique({ where: { id } });
    if (!level) return NextResponse.json({ error: "Level harga tidak ditemukan" }, { status: 404 });
    await db.priceLevel.update({ where: { id }, data: { scheduleEnabled: Boolean(enabled) } });
    return NextResponse.json({ message: enabled ? `Jadwal level ${level.name} diaktifkan` : `Jadwal level ${level.name} dinonaktifkan` });
  }
  if (action === "delete" && id) {
    const count = await db.priceLevel.count();
    if (count <= 1)
      return NextResponse.json(
        { error: "Minimal harus ada satu level harga" },
        { status: 400 },
      );
    await db.productCategory.deleteMany({ where: { levelId: id } });
    await db.priceLevel.delete({ where: { id } });
    const settings = await db.settings.findUnique();
    if (settings?.selectedLevelId === id) {
      const fallback = await db.priceLevel.findFirst({
        orderBy: { createdAt: "asc" },
      });
      await db.settings.update({
        where: { id: 1 },
        data: { selectedLevelId: fallback?.id || null },
      });
    }
    return NextResponse.json({ message: "Level harga dihapus" });
  }
  return NextResponse.json(
    { error: "Permintaan tidak valid" },
    { status: 400 },
  );
}
