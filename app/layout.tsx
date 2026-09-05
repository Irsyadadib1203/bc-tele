import "./globals.css";
import "./theme.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "BC josjis — Telegram Broadcaster",
  description: "Panel broadcast produk ke Telegram",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
