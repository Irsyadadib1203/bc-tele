import Link from "next/link";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/mysql";
import { NavLinks } from "./nav-links";
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
        <span>Bcastly</span>
      </div>
      <div className="nav-label">Menu utama</div>
      <NavLinks />
      <div className="sidebar-user">
        <span className="avatar">{username[0].toUpperCase()}</span>
        <div>
          <b>{username}</b>
          <div className="muted" style={{ fontSize: 11 }}>
            Administrator
          </div>
        </div>
      </div>
    </aside>
  );
}
