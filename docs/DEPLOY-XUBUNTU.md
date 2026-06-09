# Panduan Deploy NgopiCode di Server Xubuntu

Dokumen ini menjelaskan cara men-deploy **NgopiCode Digital Store** di mesin self-hosted ber-OS Xubuntu (Ubuntu-based), secara bertahap dan detail.

## Arsitektur Deployment

Mesin Xubuntu menghosting:

| Komponen | Teknologi | Akses |
|----------|-----------|-------|
| PostgreSQL | Docker | localhost:5432 |
| MinIO | Docker | localhost:9000 (API) / 9001 (Console) |
| Backend Vendure | PM2 (Node) | localhost:3000 → `api.ngopicode.com` |
| Dashboard Admin | bagian dari backend | `api.ngopicode.com/dashboard` |
| Frontend Nuxt (LAN, opsional) | PM2 (Node) | `192.168.x.x:3001` |
| Cloudflare Tunnel | systemd service | exposes api + storage |

> **Catatan**: Frontend produksi utama berjalan di **Vercel** (`ngopicode.com`). Instance Nuxt di Xubuntu hanya opsional untuk akses admin via LAN.

Diagram alur:

```
Internet ──► Cloudflare ──► Tunnel ──► localhost:3000 (Vendure API)
                                  └──► localhost:9000 (MinIO Storage)

LAN ──► 192.168.x.x:3000 (API/Dashboard)
    └──► 192.168.x.x:3001 (Frontend Nuxt)
```

---

## Prasyarat

- Mesin Xubuntu dengan akses sudo
- Domain sudah dikelola di Cloudflare (`ngopicode.com`)
- Cloudflare Tunnel connector token
- File project (sudah di-extract dari zip atau hasil `git clone`) di `~/ngopi-code-store`

---

## Tahap 1 — Install Prerequisites

### 1.1 Update sistem

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Node.js (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Muat nvm ke shell aktif
export NVM_DIR="$HOME/.config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node 20 LTS (direkomendasikan; v24 juga jalan tapi lebih baru)
nvm install 20
nvm use 20
nvm alias default 20

node --version
npm --version
```

### 1.3 Install Docker + Docker Compose

```bash
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker --now

# Tambahkan user ke group docker agar tidak perlu sudo
sudo usermod -aG docker $USER
```

> **PENTING**: Setelah `usermod`, **logout & login ulang** (atau reboot) agar keanggotaan group docker aktif. Tanpa ini, `docker ps` akan error `permission denied`.

Verifikasi setelah re-login:

```bash
docker ps          # tidak boleh error permission
docker --version
docker compose version
```

#### Troubleshooting konflik docker-compose

Jika muncul error `dpkg: error processing archive ... docker-compose-v2 ... which is also in package docker-compose-plugin`:

```bash
sudo dpkg --configure -a
sudo apt remove -y docker-compose-v2
sudo apt install -f -y
sudo apt install -y docker-compose-plugin
docker compose version
```

---

## Tahap 2 — Siapkan Environment Variables

```bash
cd ~/ngopi-code-store

# Salin template (jika belum ada .env)
cp backend/.env.example backend/.env
nano backend/.env
```

Isi variabel penting untuk produksi:

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ngopicode
DB_USERNAME=vendure
DB_PASSWORD=<password_kuat>

# Auth
SUPERADMIN_USERNAME=superadmin
SUPERADMIN_PASSWORD=<password_admin>
COOKIE_SECRET=<random_string_panjang>

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=<access_key>
MINIO_SECRET_KEY=<secret_key>
MINIO_BUCKET_NAME=products
MINIO_PUBLIC_URL=https://storage.ngopicode.com

# Tripay
TRIPAY_API_KEY=<api_key>
TRIPAY_PRIVATE_KEY=<private_key>
TRIPAY_MERCHANT_CODE=<merchant_code>
TRIPAY_SANDBOX=true
TRIPAY_CALLBACK_URL=https://api.ngopicode.com/payments/tripay/webhook
TRIPAY_RETURN_URL=https://ngopicode.com/order

# Email (Resend)
RESEND_API_KEY=<resend_key>
EMAIL_FROM_ADDRESS=noreply@info.ngopidulur.my.id
EMAIL_FROM_NAME=NgopiCode Store

# Frontend
STOREFRONT_URL=https://ngopicode.com

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=<connector_token>
```

> **PENTING**: `docker-compose.yml` membaca `.env` dari **root project**, bukan dari `backend/`. Salin file `.env` ke root:
>
> ```bash
> cp backend/.env .env
> ```

> **Keamanan**: Jangan pernah commit file `.env` ke git. Pastikan ada di `.gitignore`.

---

## Tahap 3 — Start PostgreSQL & MinIO (Docker)

```bash
cd ~/ngopi-code-store
docker compose up -d postgres minio
```

Verifikasi keduanya `Up (healthy)`:

```bash
docker compose ps
```

Container memiliki restart policy, sehingga **otomatis menyala kembali** setelah reboot.

---

## Tahap 4 — Setup Backend (Vendure)

```bash
cd ~/ngopi-code-store/backend

# Install dependencies
npm install
```

> **Gotcha umum**: Jika file di-extract dari zip Windows, binary di `node_modules/.bin/*` kehilangan permission execute → error `tsc: Permission denied` atau `nuxt: Permission denied`. Fix:
>
> ```bash
> chmod +x node_modules/.bin/*
> # atau reinstall bersih:
> rm -rf node_modules package-lock.json && npm install
> ```

### 4.1 Konfigurasi host Dashboard (build-time)

Dashboard Vendure menanam URL API saat **build time**, bukan runtime. Edit `vite.config.mts`:

```bash
nano ~/ngopi-code-store/backend/vite.config.mts
```

Ubah baris `api`:

```ts
// Dari:
api: { host: 'http://localhost', port: 3000 },

// Menjadi (agar dashboard bisa diakses via domain dari device mana pun):
api: { host: 'https://api.ngopicode.com', port: 443 },
```

> Jika hanya butuh akses LAN, gunakan IP: `{ host: 'http://192.168.x.x', port: 3000 }`.
> Mengedit file `dist` dengan `sed` TIDAK bekerja karena URL disusun dari host+port.

### 4.2 Build & jalankan

```bash
cd ~/ngopi-code-store/backend

# Build TypeScript + dashboard
npm run build

# Test jalankan (Ctrl+C setelah muncul "Vendure server is listening")
node --max-old-space-size=900 dist/index.js
```

Jika muncul pesan migration `relation "..." already exists`, itu **aman** — artinya tabel sudah ada dari deploy sebelumnya. Server tetap berjalan normal.

---

## Tahap 5 — Jalankan Backend dengan PM2

```bash
# Install PM2 (tanpa sudo — karena Node dikelola nvm)
npm install -g pm2
pm2 --version

# Start backend
cd ~/ngopi-code-store/backend
pm2 start node --name "vendure" -- --max-old-space-size=900 dist/index.js

pm2 status   # vendure harus "online"
```

> **Jangan pakai `sudo npm`** — sudo punya PATH berbeda dan tidak melihat Node dari nvm (`sudo: npm: command not found`).

---

## Tahap 6 — Setup Frontend LAN (Opsional)

Hanya jika perlu akses admin upload / storefront via LAN.

### 6.1 Buka firewall

```bash
sudo ufw allow 3001/tcp
```

### 6.2 Build & jalankan

```bash
cd ~/ngopi-code-store/frontend

# Buat .env frontend (arahkan ke backend lokal)
echo 'NUXT_PUBLIC_SHOP_API_URL=http://192.168.x.x:3000/shop-api' > .env

npm install
chmod +x node_modules/.bin/*   # jika perlu
npm run build

# Jalankan via PM2, bind ke semua interface
HOST=0.0.0.0 PORT=3001 pm2 start .output/server/index.mjs --name "nuxt-frontend"
pm2 status
```

Akses dari device lain: `http://192.168.x.x:3001`

---

## Tahap 7 — Cloudflare Tunnel

### 7.1 Install cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
```

### 7.2 Install sebagai service dengan connector token

```bash
sudo cloudflared service install <CLOUDFLARE_TUNNEL_TOKEN>
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

### 7.3 Konfigurasi Public Hostname (di Cloudflare Dashboard)

1. Buka **https://one.dash.cloudflare.com** → **Networks → Tunnels**
2. Pilih tunnel (mis. `ngopi-backend`) → tab **Routes** → **+ Add route**
3. Pilih **"Published application"**, lalu tambahkan dua route:

| Subdomain | Domain | Path | Service URL |
|-----------|--------|------|-------------|
| `api` | `ngopicode.com` | *(kosong)* | `http://localhost:3000` |
| `storage` | `ngopicode.com` | *(kosong)* | `http://localhost:9000` |

> Biarkan **Path kosong** agar SEMUA request diteruskan. Service URL harus diawali `http://`.
> Jika muncul warning "DNS record operation failed: HTTP 400", itu normal jika CNAME sudah ada dari setup sebelumnya.

---

## Tahap 8 — Setup MinIO Bucket

```bash
# Install MinIO client
wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
chmod +x /tmp/mc
sudo mv /tmp/mc /usr/local/bin/

# Setup alias & buat bucket
mc alias set ngopicode http://localhost:9000 <MINIO_ACCESS_KEY> <MINIO_SECRET_KEY>
mc mb ngopicode/products --ignore-existing
mc anonymous set none ngopicode/products   # bucket privat
```

---

## Tahap 9 — Firewall (UFW)

Jika UFW aktif (`sudo ufw status` → `active`), buka port yang diperlukan untuk akses LAN:

```bash
sudo ufw allow 3000/tcp   # Backend / Dashboard
sudo ufw allow 3001/tcp   # Frontend Nuxt (opsional)
sudo ufw allow 9000/tcp   # MinIO API
sudo ufw allow 9001/tcp   # MinIO Console
```

> Port 22 (SSH) biasanya sudah diizinkan. Port untuk traffic publik (80/443) ditangani Cloudflare Tunnel, bukan UFW.

---

## Tahap 10 — Auto-Start Setelah Reboot (PENTING)

Tanpa langkah ini, PM2 **tidak** akan menyalakan service setelah server reboot.

```bash
# 1. Generate perintah startup
pm2 startup
```

Perintah ini akan **menampilkan** sebuah baris `sudo env PATH=...`. **Copy-paste dan jalankan baris sudo tersebut**, contoh:

```bash
sudo env PATH=$PATH:/home/rifky/.config/nvm/versions/node/v24.16.0/bin \
  /home/rifky/.config/nvm/versions/node/v24.16.0/lib/node_modules/pm2/bin/pm2 \
  startup systemd -u rifky --hp /home/rifky
```

```bash
# 2. Simpan snapshot proses yang sedang online
pm2 save

# 3. Verifikasi service systemd aktif
systemctl is-enabled pm2-$USER   # harus "enabled"
```

### Ringkasan auto-start

| Service | Mekanisme auto-start |
|---------|----------------------|
| PostgreSQL | Docker restart policy |
| MinIO | Docker restart policy |
| Cloudflare Tunnel | systemd (`systemctl enable cloudflared`) |
| Vendure backend | PM2 systemd (`pm2 startup` + `pm2 save`) |
| Nuxt frontend | PM2 systemd (`pm2 startup` + `pm2 save`) |

---

## Tahap 11 — Verifikasi Deployment

```bash
# Lokal
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/dashboard/   # 200
curl http://localhost:3000/shop-api                                          # GraphQL error "non-empty query" = OK

# Via tunnel
curl -s -o /dev/null -w "%{http_code}\n" https://api.ngopicode.com/dashboard/  # 200
curl -s -o /dev/null -w "%{http_code}\n" https://storage.ngopicode.com          # 404 = OK (MinIO root)
```

Cek dari browser:

| URL | Ekspektasi |
|-----|-----------|
| `https://ngopicode.com` | Storefront (Vercel) |
| `https://api.ngopicode.com/dashboard/` | Login admin (superadmin) |
| `http://192.168.x.x:3001` | Storefront LAN (opsional) |
| `http://192.168.x.x:3001/admin/upload` | Panel upload produk (LAN) |

### Test reboot (disarankan)

```bash
sudo reboot
# Setelah nyala (~1-2 menit):
pm2 status     # vendure + nuxt-frontend → online
docker ps      # postgres + minio → Up
```

---

## Operasi Harian (Cheat Sheet)

```bash
# Lihat status service
pm2 status
docker ps
systemctl status cloudflared

# Lihat log
pm2 logs vendure --lines 50
pm2 logs nuxt-frontend --lines 50
docker compose logs postgres --tail 30

# Restart service
pm2 restart vendure
pm2 restart nuxt-frontend
sudo systemctl restart cloudflared

# Update kode (setelah git pull / extract baru)
cd ~/ngopi-code-store/backend && npm install && npm run build && pm2 restart vendure
cd ~/ngopi-code-store/frontend && npm install && npm run build && pm2 restart nuxt-frontend

# Database maintenance scripts
cd ~/ngopi-code-store/backend
node scripts/fix-active-orders.js
node scripts/check-transactions.js
```

---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---------|-------------------|
| `docker ps` → permission denied | Belum re-login setelah `usermod -aG docker`. Logout/login atau reboot. |
| `tsc/nuxt: Permission denied` | Binary kehilangan execute bit dari zip. `chmod +x node_modules/.bin/*` atau reinstall. |
| `sudo: npm: command not found` | Node dari nvm tidak terlihat oleh sudo. Install global tanpa sudo. |
| Docker compose `no configuration file` | Dijalankan dari folder salah. `cd` ke root project, atau pakai `docker ps`. |
| `.env variable not set` (compose) | `.env` belum ada di root. `cp backend/.env .env`. |
| Tunnel 503 "No ingress rules" | Public hostname belum dikonfigurasi di Cloudflare Dashboard (Tahap 7.3). |
| Dashboard "Failed to fetch" | API host salah di `vite.config.mts`. Set ke domain/IP yang benar, `npm run build`, `pm2 restart vendure`. |
| LAN "Failed to fetch" | Port diblokir UFW, atau CORS. Buka port (Tahap 9); CORS sudah mengizinkan `192.168.x.x`. |
| Migration `already exists` | Aman, abaikan. Tabel sudah ada dari deploy sebelumnya. |
| Service mati setelah reboot | `pm2 startup` sudo command belum dijalankan, atau `pm2 save` terlewat (Tahap 10). |

---

## Catatan Penting

- **Backend menggunakan CommonJS** — jangan ubah ke ESM.
- **Frontend produksi utama di Vercel**, bukan di Xubuntu. Instance LAN hanya opsional.
- **Memori**: Vendure heap dibatasi 900 MB (`--max-old-space-size=900`). PostgreSQL 1 GB, MinIO 512 MB. Hindari koleksi in-memory tak terbatas.
- **Webhook Tripay harus idempotent** dan selalu verifikasi HMAC signature.
- **Bucket MinIO privat** — file diakses via pre-signed URL (5 menit), jangan expose path bucket.
