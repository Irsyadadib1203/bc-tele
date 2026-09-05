import Link from "next/link";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { NavLinks } from "./nav-links";
import { SidebarProfile } from "./sidebar-profile";
const links = [
  ["/dashboard", "⌂", "Dashboard"],
  ["/products", "▦", "Produk & Filter Prefix"],
  ["/fees", "%", "Fee Seller Matrix"],
  ["/telegram", "➤", "Kirim Telegram"],
  ["/schedules", "◷", "Jadwal Broadcast"],
  ["/design", "◈", "Warna & Desain Header"],
  ["/connection", "⌁", "Koneksi & API Key"],
  ["/activity", "◉", "Activity Log"],
];
export async function Sidebar() {
  const uid = await currentUserId();
  const user = uid ? await db.user.findUnique({ where: { id: uid } }) : null;
  const username = typeof user?.username === "string" ? user.username : "Admin";
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark">✦</span>
        <span>BC josjis</span>
      </div>
      <div className="nav-label">Menu utama</div>
      <NavLinks />
      <SidebarProfile username={username} />
    </aside>
  );
}
