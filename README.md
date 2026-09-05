# BC josjis — Telegram Broadcaster

Panel Next.js untuk menyinkronkan produk dari API, menyaring prefix kode produk, lalu mengirim kartu harga berbentuk PNG ke Telegram.

## Menjalankan

1. Salin `.env.example` menjadi `.env`, lalu isi koneksi MySQL dan `SESSION_SECRET`.
2. Buat database MySQL bernama `telegram_broadcaster` (atau sesuaikan URL).
3. Jalankan `npm install`.
4. Jalankan `npm run db:init` untuk membuat tabel dan akun seed.
5. Jalankan `npm run dev`.

Masuk menggunakan akun seed: `admin` / `admin123`.

## Integrasi

Masukkan Site URL dan API Key pada halaman **Koneksi & API Key**. Aplikasi memanggil `{{siteUrl}}/v1/products` menggunakan header `Authorization: {apikey}`. Produk aktif dikelompokkan berdasarkan `category_title`.

Konfigurasikan Bot Token serta Target Chat/Channel ID, pilih kategori di halaman Produk, lalu klik **BC**. Gambar PNG beserta caption akan dikirim melalui Telegram `sendPhoto`.

Jadwal broadcast tersimpan di MySQL. Untuk produksi, hubungkan scheduler/cron deployment Anda ke worker broadcast sesuai kebutuhan infrastruktur (misalnya Vercel Cron, cron server, atau queue worker).
