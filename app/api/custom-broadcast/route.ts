import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { sendCustomBroadcast } from "@/lib/custom-broadcast";
import { db } from "@/lib/mysql";

function details(value: unknown) {
  if (typeof value !== "string") return null;
  return value.trim();
}

export async function POST(request: Request) {
  if (!(await currentUserId())) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const body = await request.json();
  const action = body?.action;

  if (action === "create") {
    const name = details(body.name);
    if (!name) return NextResponse.json({ error: "Nama BC custom wajib diisi" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "Nama BC custom maksimal 100 karakter" }, { status: 400 });
    const created = await db.customBroadcast.create({
      data: { name, content: typeof body.content === "string" ? body.content : "" },
    });
    return NextResponse.json({ message: `BC custom ${created.name} ditambahkan`, item: created });
  }

  if (action === "update" && typeof body.id === "string") {
    const name = details(body.name);
    if (!name) return NextResponse.json({ error: "Nama BC custom wajib diisi" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "Nama BC custom maksimal 100 karakter" }, { status: 400 });
    if (typeof body.content !== "string") return NextResponse.json({ error: "Isi BC custom tidak valid" }, { status: 400 });
    await db.customBroadcast.update({ where: { id: body.id }, data: { name, content: body.content } });
    return NextResponse.json({ message: "BC custom disimpan" });
  }

  if (action === "delete" && typeof body.id === "string") {
    if ((await db.customBroadcast.count()) <= 1) {
      return NextResponse.json({ error: "Minimal satu BC custom harus tersedia" }, { status: 400 });
    }
    await db.customBroadcast.delete({ where: { id: body.id } });
    return NextResponse.json({ message: "BC custom dihapus" });
  }

  if (action === "send" && typeof body.id === "string") {
    const [customBroadcast, settings] = await Promise.all([
      db.customBroadcast.findUnique({ where: { id: body.id } }),
      db.settings.findUnique(),
    ]);
    if (!customBroadcast) return NextResponse.json({ error: "BC custom tidak ditemukan" }, { status: 404 });
    try {
      const name = await sendCustomBroadcast(customBroadcast, settings);
      return NextResponse.json({ message: `BC custom ${name} berhasil dikirim` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengirim BC custom";
      await db.activityLog.create({ data: { type: "ERROR", message: `BC custom ${customBroadcast.name} gagal: ${message}`, meta: { customBroadcastId: customBroadcast.id } } });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
}
