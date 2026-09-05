# Deployment Ubuntu VPS

Konfigurasi ini menggunakan Node.js, MySQL, Nginx, dan systemd. Folder aplikasi yang dipakai service adalah `/var/www/bcastly`.

## 1. Siapkan server

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx git certbot python3-certbot-nginx
sudo adduser --system --group --home /var/www/bcastly bcastly
```

## 2. Database MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE telegram_broadcaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bcastly'@'127.0.0.1' IDENTIFIED BY 'PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON telegram_broadcaster.* TO 'bcastly'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Ambil aplikasi dan konfigurasi environment

```bash
sudo -u bcastly git clone REPOSITORY_GITHUB_ANDA /var/www/bcastly
sudo mkdir -p /etc/bcastly
sudo cp /var/www/bcastly/deploy/bcastly.env.example /etc/bcastly/bcastly.env
sudo nano /etc/bcastly/bcastly.env
sudo chmod 600 /etc/bcastly/bcastly.env
sudo chown root:bcastly /etc/bcastly/bcastly.env
cd /var/www/bcastly
sudo -u bcastly npm ci
sudo -u bcastly npm run db:init
sudo -u bcastly npm run build
```

Generate `SESSION_SECRET` dengan `openssl rand -hex 32`. Isi juga Site URL produk pada `PRODUCTS_SITE_URL`.

## 4. Service dan domain

```bash
sudo cp /var/www/bcastly/deploy/bcastly.service /etc/systemd/system/bcastly.service
sudo systemctl daemon-reload
sudo systemctl enable --now bcastly
sudo cp /var/www/bcastly/deploy/nginx-bcastly.conf /etc/nginx/sites-available/bcastly
sudo nano /etc/nginx/sites-available/bcastly
sudo ln -s /etc/nginx/sites-available/bcastly /etc/nginx/sites-enabled/bcastly
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d DOMAIN_ANDA.com -d www.DOMAIN_ANDA.com
```

## Update aplikasi

```bash
cd /var/www/bcastly
sudo -u bcastly git pull
sudo -u bcastly npm ci
sudo -u bcastly npm run db:init
sudo -u bcastly npm run build
sudo systemctl restart bcastly
```

Status/log: `sudo systemctl status bcastly` dan `sudo journalctl -u bcastly -f`.
