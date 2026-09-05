import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
export async function POST(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const ct = req.headers.get("content-type") || "";
  let data: Record<string, any> = {};
  if (ct.includes("application/json")) data = await req.json();
  else {
    const f = await req.formData();
    f.forEach((v, k) => (data[k] = String(v)));
  }
  const allowed = [
    "botToken",
    "targetChatId",
    "caption",
    "broadcastFormat",
    "headerTitle",
    "headerSubtitle",
    "primaryColor",
    "accentColor",
    "headerImageUrl",
    "theme",
  ];
  const update: any = {};
  for (const key of allowed) if (key in data) update[key] = data[key] || null;
  if ("pollingInterval" in data)
    update.pollingInterval = Number(data.pollingInterval);
  if ("scheduleEnabled" in data)
    update.scheduleEnabled =
      data.scheduleEnabled === true || data.scheduleEnabled === "true";
  await prisma.settings.upsert({
    where: { id: 1 },
    update,
    create: { id: 1, ...update },
  });
  await prisma.activityLog.create({
    data: { type: "SETTINGS", message: "Pengaturan broadcaster diperbarui" },
  });
  if (ct.includes("application/json"))
    return NextResponse.json({ message: "Pengaturan berhasil disimpan" });
  return NextResponse.redirect(
    new URL(req.headers.get("referer") || "/dashboard", req.url),
  );
}
