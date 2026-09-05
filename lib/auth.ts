import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
const COOKIE = "bc_session";
const secret = process.env.SESSION_SECRET || "development-change-this-secret";
export function signSession(userId: string) { const signature = createHmac("sha256", secret).update(userId).digest("hex"); return `${userId}.${signature}`; }
export function verifySession(value?: string) { if (!value) return null; const [id, signature] = value.split("."); if (!id || !signature) return null; const expected = createHmac("sha256", secret).update(id).digest("hex"); try { return timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? id : null; } catch { return null; } }
export async function currentUserId() { return verifySession((await cookies()).get(COOKIE)?.value); }
export const sessionCookie = COOKIE;
