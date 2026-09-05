import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/mysql";
import { sessionCookie, signSession } from "@/lib/auth";
export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const user = await db.user.findUnique({ where: { username } });
  const expectsJson = request.headers.get("accept")?.includes("application/json");
  if (
    !user ||
    typeof user.id !== "string" ||
    typeof user.passwordHash !== "string" ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    if (expectsJson)
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    return NextResponse.redirect(
      new URL("/login?error=Username+atau+password+salah", request.url),
    );
  }
  if (expectsJson) {
    const response = NextResponse.json({ message: "Login berhasil" });
    response.cookies.set(sessionCookie, signSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(sessionCookie, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
