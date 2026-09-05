import { NextResponse } from "next/server";
import { db } from "@/lib/mysql";
import { currentUserId } from "@/lib/auth";
export async function POST(req: Request) {
  if (!(await currentUserId()))
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const ct = req.headers.get("content-type") || "";
  let data: Record<string, any> = {};
  const expectsJson = ct.includes("application/json") || req.headers.get("accept")?.includes("application/json");
  if (ct.includes("application/json")) data = await req.json();
  else {
    const f = await req.formData();
    f.forEach((v, k) => (data[k] = String(v)));
  }
  const allowed = [
    "botToken",
    "targetChatId",
    "caption",
    "imageCaption",
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
  await db.settings.upsert({
    where: { id: 1 },
    update,
    create: { id: 1, ...update },
  });
  await db.activityLog.create({
    data: { type: "SETTINGS", message: "Pengaturan broadcaster diperbarui" },
  });
  if (expectsJson)
    return NextResponse.json({ message: "Pengaturan berhasil disimpan" });
  return NextResponse.redirect(
    new URL(req.headers.get("referer") || "/dashboard", req.url),
  );
}
