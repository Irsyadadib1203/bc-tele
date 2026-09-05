import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
export async function POST(request: Request) {
  if (request.headers.get("accept")?.includes("application/json")) {
    const response = NextResponse.json({ message: "Anda berhasil keluar" });
    response.cookies.set(sessionCookie, "", { path: "/", maxAge: 0 });
    return response;
  }
  const r = NextResponse.redirect(new URL("/login", request.url));
  r.cookies.set(sessionCookie, "", { path: "/", maxAge: 0 });
  return r;
}
