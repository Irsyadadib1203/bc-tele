import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
export async function PATCH(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const { id, levelId, selected, prefixFilterEnabled, excludedPrefixes } =
    await req.json();
  if (typeof levelId === "string" && typeof selected === "boolean") {
    const level = await prisma.priceLevel.findUnique({ where: { id: levelId } });
    if (!level) return NextResponse.json({ error: "Level harga tidak ditemukan" }, { status: 404 });
    const result = await prisma.productCategory.updateMany({ where: { levelId }, data: { selected } });
    return NextResponse.json({ message: `${result.count} kategori pada level ${level.name} ${selected ? "dipilih" : "dikosongkan"}` });
  }
  if (typeof id !== "string")
    return NextResponse.json(
      { error: "Kategori tidak ditemukan" },
      { status: 400 },
    );
  const data: any = {};
  if (typeof selected === "boolean") data.selected = selected;
  if (typeof prefixFilterEnabled === "boolean")
    data.prefixFilterEnabled = prefixFilterEnabled;
  if (typeof excludedPrefixes === "string")
    data.excludedPrefixes = excludedPrefixes;
  await prisma.productCategory.update({ where: { id }, data });
  return NextResponse.json({ message: "Kategori diperbarui" });
}
