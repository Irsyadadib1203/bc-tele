import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { syncAllLevels } from "@/lib/product-sync";

export async function POST() {
  if (!(await currentUserId())) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  const settings = await db.settings.findUnique();
  try {
    const result = await syncAllLevels(settings);
    if (!result.synced.length && !result.failed.length) {
      return NextResponse.json({ error: "Belum ada level dengan API Key yang dapat disinkronkan." }, { status: 400 });
    }
    const productCount = result.synced.reduce((total, level) => total + level.productCount, 0);
    const broadcasts = result.synced.reduce((total, level) => total + level.automaticBroadcasts, 0);
    const failures = result.synced.reduce((total, level) => total + level.automaticBroadcastFailures, 0) + result.failed.length;
    return NextResponse.json({
      message: `${productCount} produk dari ${result.synced.length} level berhasil disinkronkan. ${broadcasts} BC perubahan harga terkirim${failures ? `, ${failures} gagal` : ""}${result.skipped.length ? `. ${result.skipped.length} level tanpa API Key dilewati` : ""}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungkan API";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
