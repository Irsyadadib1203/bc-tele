import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { makeCategoryBroadcastImage } from "@/lib/broadcast";
import { db } from "@/lib/mysql";

export async function GET(request: Request) {
  if (!(await currentUserId())) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const categoryId = new URL(request.url).searchParams.get("categoryId");
  if (!categoryId) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
  }

  const [category, settings] = await Promise.all([
    db.productCategory.findUnique({ where: { id: categoryId } }),
    db.settings.findUnique(),
  ]);
  if (!category) {
    return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
  }

  try {
    const image = await makeCategoryBroadcastImage(category, settings ?? {});
    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat preview gambar";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
