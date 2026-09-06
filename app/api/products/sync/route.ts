import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { syncSelectedLevel } from "@/lib/product-sync";

export async function POST() {
  if (!(await currentUserId())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const settings = await db.settings.findUnique();
  try {
    const result = await syncSelectedLevel(settings);
    return NextResponse.json({
      message: `${result.productCount} produk aktif untuk ${result.levelName} berhasil disinkronkan. ${result.automaticBroadcasts} BC perubahan harga terkirim${result.automaticBroadcastFailures ? `, ${result.automaticBroadcastFailures} gagal` : ""}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungkan API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
