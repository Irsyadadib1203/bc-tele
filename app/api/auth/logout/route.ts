import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
export async function POST(request: Request) {
  const r = NextResponse.redirect(new URL("/login", request.url));
  r.cookies.set(sessionCookie, "", { path: "/", maxAge: 0 });
  return r;
}
