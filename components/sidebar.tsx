import Link from "next/link";
import { currentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NavLinks } from "./nav-links";
const links = [
  ["/dashboard", "⌂", "Dashboard"], ["/products", "▦", "Produk & Filter Prefix"], ["/fees", "%", "Fee Seller Matrix"], ["/telegram", "➤", "Kirim Telegram"], ["/schedules", "◷", "Jadwal Broadcast"], ["/design", "◈", "Warna & Desain Header"], ["/connection", "⌁", "Koneksi & API Key"], ["/activity", "◉", "Activity Log"]
];
export async function Sidebar() { const uid = await currentUserId(); const user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null; return <aside className="sidebar"><div className="logo"><span className="logo-mark">✦</span><span>Bcastly</span></div><div className="nav-label">Menu utama</div><NavLinks/><div className="sidebar-user"><span className="avatar">{(user?.username || "A")[0].toUpperCase()}</span><div><b>{user?.username || "Admin"}</b><div className="muted" style={{fontSize:11}}>Administrator</div></div></div></aside>; }
