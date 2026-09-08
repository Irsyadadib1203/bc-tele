"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map(([href, icon, name]) => (
        <Link
          key={href}
          href={href}
          className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
          onClick={() => window.dispatchEvent(new Event("close-mobile-menu"))}
        >
          <span className="nav-icon">{icon}</span>
          {name}
        </Link>
      ))}
    </>
  );
}
