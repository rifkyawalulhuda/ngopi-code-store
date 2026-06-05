# Dokumentasi NgopiCode Digital Store

Platform e-commerce headless untuk menjual produk digital (source code, ebook, template) kepada developer Indonesia. Dibangun dengan Vendure 3.6 (backend) dan Nuxt 3 (frontend), dilengkapi fulfillment digital otomatis melalui payment gateway Tripay.

---

## Daftar Isi

- [1. Gambaran Umum](#1-gambaran-umum)
- [2. Arsitektur & Desain Sistem](#2-arsitektur--desain-sistem)
- [3. Panduan Development](#3-panduan-development)
- [4. Deployment](#4-deployment)
- [5. Referensi API](#5-referensi-api)
- [6. Fitur-Fitur](#6-fitur-fitur)
- [7. Testing](#7-testing)

---

## 1. Gambaran Umum

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Vendure 3.6 (NestJS + TypeScript) |
| Admin Dashboard | @vendure/dashboard (React) di `/dashboard` |
| Frontend | Nuxt 3 (Vue 3 + Apollo + Pinia, SSR) |
| Database | PostgreSQL 16 (TypeORM) |
| File Storage | MinIO (S3-compatible, private bucket) |
| Payment | Tripay gateway (VA, E-Wallet, QRIS) |
| Email | Resend SDK |
| Deployment | Docker Compose + Dokploy (backend), Vercel (frontend) |

### Struktur Proyek

```
ngopi-code-store/
├── backend/           # Vendure 3.6 (NestJS, GraphQL, TypeORM)
├── frontend/          # Nuxt 3 (Vue 3, SSR, Apollo)
├── deploy/            # Konfigurasi deployment (Cloudflare, Postgres tuning)
├── docs/              # Dokumentasi proyek
├── docker-compose.yml # Dev lokal: vendure, postgres, minio, cloudflare-tunnel
├── dev.bat            # Auto-start semua dev server (Windows)
├── dokploy.yml        # Metadata deployment produksi
└── .env.example       # Template environment variables
```

### Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└───────┬───────────────────────────────────┬─────────────────────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐                  ┌─────────────────┐
│  Vercel CDN   │                  │ Cloudflare Tunnel│
│  (Frontend)   │                  │   (Backend)      │
└───────┬───────┘                  └────────┬────────┘
        │                                   │
        ▼                                   ▼
┌───────────────┐    GraphQL       ┌─────────────────┐
│   Nuxt 3      │◄────────────────►│   Vendure 3.6   │
│   (SSR/CSR)   │   Shop API       │   (NestJS)      │
│   Port 3001   │                  │   Port 3000     │
└───────────────┘                  └──┬──────┬───┬───┘
                                      │      │   │
                          ┌───────────┘      │   └───────────┐
                          ▼                  ▼               ▼
                   ┌────────────┐    ┌────────────┐   ┌──────────┐
                   │ PostgreSQL │    │   MinIO    │   │  Tripay  │
                   │    16      │    │  (Storage) │   │ (Payment)│
                   └────────────┘    └────────────┘   └──────────┘
```

### Quick Start

```bash
# Clone repository
git clone <repo-url> ngopi-code-store
cd ngopi-code-store

# Salin file environment
cp .env.example .env
cp backend/.env.example backend/.env

# Jalankan services (PostgreSQL, MinIO)
docker compose up -d postgres minio

# Setup backend
cd backend
npm install
npm run migration:run
npm run dev

# Setup frontend (terminal baru)
cd frontend
npm install
npm run dev
```

Atau di Windows, jalankan `dev.bat` untuk start semuanya sekaligus.

---

## 2. Arsitektur & Desain Sistem

### Arsitektur Backend

```
backend/src/
├── index.ts              # Entry point bootstrap Vendure
├── vendure-config.ts     # Konfigurasi utama (plugins, middleware, DB, custom fields)
├── data-source.ts        # TypeORM DataSource untuk CLI migrasi
├── config/
│   ├── custom-order-process.ts   # State machine order (forward-only)
│   ├── idr-money-strategy.ts     # Penanganan mata uang IDR zero-decimal
│   └── security.ts               # Konfigurasi keamanan
├── middleware/
│   ├── memory-guard.middleware.ts       # Monitoring penggunaan memori
│   ├── auth-rate-limiter.middleware.ts  # Rate limiting endpoint auth
│   ├── download-rate-limiter.middleware.ts  # Rate limiting download
│   └── health-check.middleware.ts       # Endpoint health check
├── migrations/           # Migrasi TypeORM (timestamp-prefixed)
├── plugins/
│   ├── tripay-payment/       # Integrasi payment gateway
│   ├── digital-fulfillment/  # Manajemen download + MinIO
│   ├── email/                # Email transaksional (Resend)
│   └── integration/          # Integration tests
└── shared/types/         # Interface TypeScript bersama
```

### Pola Plugin

Setiap fitur adalah plugin Vendure mandiri dengan struktur:

```
plugins/{nama-fitur}/
├── {nama-fitur}.plugin.ts   # Class plugin (NestJS module)
├── api/
│   ├── api-extensions.ts       # Definisi tipe GraphQL SDL
│   ├── *-admin.resolver.ts     # Resolver Admin API
│   └── *-shop.resolver.ts      # Resolver Shop API
├── controllers/                # Endpoint REST (webhooks)
├── entities/                   # Entity TypeORM (extend VendureEntity)
├── services/                   # Service NestJS yang injectable
└── utils/                      # Utility khusus plugin
```

Plugin didaftarkan di `vendure-config.ts`.

### Daftar Plugin

| Plugin | Tanggung Jawab |
|--------|---------------|
| `tripay-payment` | Integrasi API Tripay, penanganan webhook, verifikasi signature HMAC |
| `digital-fulfillment` | CRUD produk digital, upload/download MinIO, generate URL pre-signed, otomasi fulfillment |
| `email` | Email transaksional via Resend SDK (verifikasi, konfirmasi order, perubahan email) |
| `integration` | Test integrasi end-to-end |

### Middleware

| Middleware | Fungsi |
|-----------|--------|
| `memory-guard` | Monitor penggunaan heap, return 503 saat memori tinggi |
| `auth-rate-limiter` | Rate limit endpoint autentikasi |
| `download-rate-limiter` | Rate limit permintaan download per user |
| `health-check` | Expose endpoint `/health` untuk monitoring |

### Custom Order Process

State machine order bersifat **forward-only** — customer tidak bisa mundur ke state sebelumnya.

```
AddingItems → ArrangingPayment → PaymentAuthorized → PaymentSettled → Delivered
```

Webhook Tripay memicu transisi `PaymentSettled → Delivered`, yang mengaktifkan digital fulfillment.

### Strategi Mata Uang IDR

- Disimpan sebagai integer (contoh: `150000` = Rp 150.000)
- Tidak ada unit pecahan (sen) dalam praktik
- Ditampilkan dengan format locale `id-ID`

### Arsitektur Frontend

```
frontend/
├── app.vue              # Root component
├── nuxt.config.ts       # Konfigurasi Nuxt (Apollo, Pinia, SSR, port 3001)
├── pages/               # Routing berbasis file
├── composables/         # Vue composables (logika bisnis)
├── components/          # Komponen Vue reusable
├── graphql/
│   ├── queries/         # Operasi baca GraphQL
│   └── mutations/       # Operasi tulis GraphQL
├── stores/              # Pinia stores (cart)
├── assets/css/          # Design tokens, tema (light/dark)
└── utils/               # Fungsi utility murni
```

### Strategi Rendering

| Pola Route | Rendering | Alasan |
|-----------|-----------|--------|
| `/`, `/products/**` | SSR | SEO untuk halaman katalog |
| `/account/**`, `/buy/**` | CSR | Konten user terotentikasi |
| `/order/**`, `/receipt/**` | CSR | Data order dinamis |

### Pola Composable

Halaman dibuat tipis — logika bisnis ada di `composables/use*.ts`:

| Composable | Domain |
|-----------|--------|
| `useAuth` | Autentikasi (register, login, logout, verify, profil) |
| `useShop` | Fetching produk dan katalog |
| `useDownload` | Generate link download |
| `useWhatsapp` | Info kontak channel (WhatsApp, GitHub, email) |
| `useCart` | Keranjang belanja |
| `useCheckout` | Proses checkout |
| `useTheme` | Tema gelap/terang |
| `useProductFilters` | Filter produk di katalog |

### Database

- **Engine**: PostgreSQL 16
- **ORM**: TypeORM (via Vendure)
- **Connection pool**: 10 koneksi
- **Migrasi**: Timestamp-prefixed, di-generate terhadap schema yang berjalan

Entity kustom utama:

| Entity | Tabel | Fungsi |
|--------|-------|---------|
| `DigitalProduct` | `digital_product` | Metadata file terkait product variant |
| `DigitalDownload` | `digital_download` | Record download per order line |
| `TripayTransaction` | `tripay_transaction` | Pelacakan transaksi pembayaran |

### File Storage (MinIO)

- **Bucket**: `products` (akses private)
- **Akses**: URL pre-signed dengan expiry 5 menit
- **Upload**: Endpoint Admin API (`uploadDigitalProduct`)
- **Download**: Shop API generate URL pre-signed on demand

---

## 3. Panduan Development

### Prasyarat

| Software | Versi | Fungsi |
|----------|-------|--------|
| Node.js | 18+ | Runtime |
| PostgreSQL | 16 | Database |
| MinIO | Latest | File storage (S3-compatible) |
| Docker & Docker Compose | Latest | Orkestrasi container |

### Environment Variables

Variabel environment didefinisikan di `.env.example` (root) dan `backend/.env.example`:

| Variabel | Deskripsi |
|----------|-----------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Koneksi PostgreSQL |
| `DB_USERNAME`, `DB_PASSWORD` | Kredensial database |
| `MINIO_ENDPOINT`, `MINIO_PORT` | Koneksi MinIO |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Kredensial MinIO |
| `TRIPAY_API_KEY`, `TRIPAY_PRIVATE_KEY` | Payment gateway Tripay |
| `TRIPAY_MERCHANT_CODE` | Kode merchant Tripay |
| `TRIPAY_SANDBOX` | `true` untuk development |
| `RESEND_API_KEY` | Layanan email |

> **Jangan pernah commit kredensial asli.** Gunakan `.env.example` sebagai template saja.

### Menjalankan Proyek

#### Opsi 1: `dev.bat` (Windows)

```bash
dev.bat
```

#### Opsi 2: Manual

**Terminal 1 — Backend (port 3000):**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 3001):**

```bash
cd frontend
npm run dev
```

### Layanan yang Tersedia

| Layanan | URL | Deskripsi |
|---------|-----|-----------|
| Backend API | `http://localhost:3000` | Server GraphQL Vendure |
| Shop API | `http://localhost:3000/shop-api` | API untuk customer |
| Admin API | `http://localhost:3000/admin-api` | Operasi admin |
| Admin Dashboard | `http://localhost:3000/dashboard` | UI admin React |
| Frontend | `http://localhost:3001` | Storefront Nuxt 3 |

**Kredensial admin development:** `superadmin` / `superadmin`

### Setup Database

```bash
# Jalankan PostgreSQL
docker compose up -d postgres

# Jalankan migrasi
cd backend
npm run migration:run

# Generate migrasi baru (setelah modifikasi entity)
npm run migration:generate
```

### Setup MinIO

```bash
docker compose up -d minio
```

- **Bucket**: `products` (dibuat otomatis saat start pertama)
- **Console**: `http://localhost:9001`
- **Akses**: Private (URL pre-signed untuk download, expiry 5 menit)

### Konvensi Kode

#### Sistem Modul

| Layer | Sistem | Catatan |
|-------|--------|---------|
| Backend | CommonJS | `require`/`module.exports`, strict mode |
| Frontend | ESM | Nuxt auto-import composables dan components |

#### Konfigurasi TypeScript

**Backend:** `strict: true`, `experimentalDecorators: true`, `emitDecoratorMetadata: true`, Target ES2021

**Frontend:** `strict: true`, `typeCheck` disabled di nuxt config

#### Konvensi Penamaan

| Elemen | Konvensi | Contoh |
|--------|----------|--------|
| File | kebab-case | `digital-fulfillment.service.ts` |
| Class/Entity | PascalCase | `DigitalProduct`, `TripayTransaction` |
| Fungsi/Variabel | camelCase | `generateDownloadUrl` |
| Migrasi | Timestamp + PascalCase | `1719000000000-CreateTripayTransaction.ts` |
| Plugin | kebab-case directory | `tripay-payment/` |

### Path Alias

**Backend:**

| Alias | Mapping |
|-------|---------|
| `@plugins/*` | `src/plugins/*` |
| `@config/*` | `src/config/*` |
| `@shared/*` | `src/shared/*` |

**Frontend:** `~/` (konvensi Nuxt)

---

## 4. Deployment

### Infrastruktur Produksi

```
┌──────────────────────────────────────────────────────────┐
│              Server Self-Hosted (8 GB RAM)                │
│              Dikelola via Dokploy                         │
│                                                          │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │   Vendure    │  │PostgreSQL│  │      MinIO       │  │
│  │  (Backend)   │  │    16    │  │    (Storage)     │  │
│  │  900 MB heap │  │   1 GB   │  │     512 MB      │  │
│  │  Port 3000   │  │Port 5432 │  │  Port 9000/9001 │  │
│  └──────────────┘  └──────────┘  └──────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            Cloudflare Tunnel (HTTPS)               │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

| Komponen | Host | Memori |
|----------|------|--------|
| Vendure (backend + admin) | Self-hosted (Dokploy) | 900 MB heap max |
| PostgreSQL 16 | Self-hosted | 1 GB |
| MinIO | Self-hosted | 512 MB |
| Cloudflare Tunnel | Self-hosted | Minimal |
| Nuxt 3 (frontend) | Vercel | Managed |

### Docker Compose

#### Perintah Utama

```bash
# Start semua service
docker compose up -d

# Stop semua service
docker compose down

# Lihat log service tertentu
docker compose logs vendure
docker compose logs postgres

# Rebuild setelah perubahan kode
docker compose up -d --build vendure

# Restart satu service
docker compose restart vendure
```

### Frontend di Vercel

```bash
cd frontend
npm run build
# Deploy via Vercel CLI atau Git integration
```

Konfigurasi Vercel: Framework Nuxt 3, Build command `npm run build`, Output `.output`

### Backup Database

```bash
# Backup manual
docker compose exec postgres pg_dump -U <username> <dbname> > backup_$(date +%Y%m%d).sql

# Backup terkompresi
docker compose exec postgres pg_dump -U <username> <dbname> | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
cat backup.sql | docker compose exec -T postgres psql -U <username> <dbname>
```

### Monitoring

**Health Check Endpoint:**

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "memory": { "heapUsed": 450000000, "heapTotal": 900000000 }
}
```

**Memory Guard:** Middleware yang monitor penggunaan heap dan return HTTP 503 saat memori melebihi batas.

---

## 5. Referensi API

### Endpoint GraphQL

| Endpoint | URL | Auth | Fungsi |
|----------|-----|------|--------|
| Shop API | `/shop-api` | Token customer (opsional) | Operasi customer |
| Admin API | `/admin-api` | Bearer token admin | Manajemen toko |

### Ekstensi Shop API

#### `generateDownloadUrl`

Generate URL pre-signed MinIO untuk download produk digital.

```graphql
mutation GenerateDownloadUrl($productVariantId: ID!) {
  generateDownloadUrl(productVariantId: $productVariantId) {
    url
    fileName
  }
}
```

**Syarat:** Customer terotentikasi + memiliki order yang sudah dibayar berisi variant ini.

#### `requestDownloadLink`

Request download via token (dengan counter download).

```graphql
mutation RequestDownloadLink($downloadToken: String!) {
  requestDownloadLink(downloadToken: $downloadToken) {
    url
    expiresIn
    remainingDownloads
    fileName
  }
}
```

#### `Order.downloads` Field

```graphql
query GetOrderByCode($code: String!) {
  orderByCode(code: $code) {
    code
    state
    downloads {
      id
      fileName
      maxDownloads
      currentDownloads
      expiresAt
      isActive
      downloadToken
    }
  }
}
```

### Ekstensi Admin API

#### `uploadDigitalProduct`

Upload file produk digital untuk variant tertentu.

```graphql
mutation UploadDigitalProduct($variantId: ID!, $file: Upload!) {
  uploadDigitalProduct(variantId: $variantId, file: $file) {
    id
    productVariantId
    fileName
    originalFileName
    fileSize
    mimeType
    bucket
    objectKey
  }
}
```

#### `deleteDigitalProduct`

```graphql
mutation DeleteDigitalProduct($variantId: ID!) {
  deleteDigitalProduct(variantId: $variantId)
}
```

#### `digitalProductByVariantId`

```graphql
query DigitalProductByVariantId($variantId: ID!) {
  digitalProductByVariantId(variantId: $variantId) {
    id
    productVariantId
    fileName
    originalFileName
    fileSize
    mimeType
    bucket
    objectKey
  }
}
```

### Webhook Tripay

**Endpoint:** `POST /payments/tripay/webhook`

#### Format Request

```json
{
  "merchant_ref": "KODE-ORDER",
  "reference": "T123456789",
  "status": "PAID",
  "amount": 150000,
  "paid_at": "2024-01-01 12:00:00",
  "signature": "hmac_sha256_signature"
}
```

#### Verifikasi Signature

```
signature = HMAC-SHA256(privateKey, merchantRef + merchantCode + amount)
```

#### Alur Pemrosesan

1. Verifikasi signature HMAC → tolak jika invalid (401)
2. Cari order berdasarkan `merchant_ref`
3. Cek idempotency (skip jika sudah diproses)
4. Transisi order: `PaymentSettled → Delivered`
5. Trigger digital fulfillment (buat record download)
6. Return 200 OK

### Custom Fields

#### Channel (Public — diset di Admin Dashboard)

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `whatsappNumber` | `String` | Nomor WhatsApp toko |
| `githubLink` | `String` | URL GitHub toko |
| `ownerEmail` | `String` | Email pemilik toko |

```graphql
query { activeChannel { customFields { whatsappNumber githubLink ownerEmail } } }
```

#### Customer (Public)

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `whatsappNumber` | `String` | Nomor WhatsApp customer (opsional) |

#### Product

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `keyFeatures` | `String` | Fitur utama (comma-separated) |
| `deliveryInfo` | `String` | Info pengiriman |
| `productType` | `String` | Tipe produk |
| `fileFormat` | `String` | Format file (ZIP, PDF, dll) |
| `licenseType` | `String` | Tipe lisensi (MIT, Personal, dll) |

---

## 6. Fitur-Fitur

### Katalog Produk

Produk diorganisir menggunakan **collections sebagai kategori**. Halaman katalog di-render server-side (SSR) untuk SEO.

| Collection | Produk |
|-----------|--------|
| Source Code | Paket source code proyek lengkap |
| Ebooks | Ebook dan panduan teknis |

### Tipe Produk (Berbasis Facet)

| Aturan Pembelian | Perilaku |
|------------------|----------|
| `one-time` | Blokir pembelian ulang. Muncul di Pustaka (library). Tombol Download. |
| `repeatable` | Boleh beli berkali-kali. TIDAK muncul di Pustaka. CTA WhatsApp setelah bayar. |

### Autentikasi Customer

```
Register (email + password + nama)
  → Akun dibuat (belum terverifikasi)
  → Email verifikasi dikirim (Resend)
  → Customer klik link verifikasi
  → Akun terverifikasi → Bisa login
```

- Token verifikasi berlaku 7 hari
- Login redirect ke `/account`
- Rate limiting: login 5x/15menit, register 3x/15menit per IP

### Alur Pembelian

```
1. Halaman produk (/products/[slug])
   └→ Klik "Beli Sekarang"

2. Cek login
   └→ Jika belum login → redirect ke /auth

3. Halaman checkout (/buy/[slug])
   └→ Pilih channel pembayaran (VA / E-Wallet / QRIS)
   └→ E-Wallet: masukkan nomor HP

4. Pembuatan order
   └→ Backend buat order Vendure
   └→ Backend panggil API Tripay → dapat instruksi pembayaran
   └→ Simpan payCode, instruksi, expiry di metadata order

5. Pembayaran
   └→ Customer bayar via bank/e-wallet/QRIS

6. Callback webhook
   └→ Tripay POST → /payments/tripay/webhook
   └→ Verifikasi signature → transisi order → fulfillment

7. Halaman konfirmasi (/order/[code])
   └→ Status pembayaran (Lunas/Menunggu)
   └→ CTA Download → /account (Pustaka)
   └→ CTA Bukti Transaksi → /receipt/[code]
```

### Digital Download

```
Pembayaran dikonfirmasi (webhook)
  → Order transisi ke Delivered
  → Record DigitalDownload dibuat (satu per order line)
  → Customer klik "Unduh Sekarang" di halaman order
  → Navigasi ke /account (Pustaka Saya)
  → Klik "Unduh" pada kartu library
  → Backend: validasi auth + kepemilikan + status bayar
  → Generate URL pre-signed MinIO (expiry 5 menit)
  → Browser auto-download file
```

### Dashboard Akun

**Layout:** Sidebar collapsible (persisted via cookie) + area konten. Mobile: drawer navigation.

| Tab | Label | Konten |
|-----|-------|--------|
| Library | Pustaka Saya | Produk digital yang dimiliki + tombol download |
| Orders | Riwayat Pesanan | Riwayat order dengan badge status |
| Wishlist | Wishlist | Produk tersimpan |
| Settings | Pengaturan | Profil, email, password |

**Pustaka Saya:** Search bar + filter kategori (chip dari collections). Produk dicocokkan via `product.collections[].slug`.

### Bukti Transaksi (`/receipt/[code]`)

- Print/PDF via `window.print()`
- Header brand (logo terminal + NgopiCode)
- Meta: kode order, tanggal, badge status
- Info pembeli, tabel produk, total
- Detail pembayaran dengan logo channel (SVG)
- Footer dengan email owner dari activeChannel
- Print styles force light mode (override dark theme)

### Metode Pembayaran

| Tipe | Provider | Kode |
|------|----------|------|
| Virtual Account | BRI | `BRIVA` |
| Virtual Account | BNI | `BNIVA` |
| Virtual Account | Mandiri | `MANDIRIVA` |
| Virtual Account | BCA | `BCAVA` |
| E-Wallet | OVO | `OVO` |
| E-Wallet | DANA | `DANA` |
| E-Wallet | ShopeePay | `SHOPEEPAY` |
| QRIS | Universal | `QRIS` |

### Sistem Tema (Dark/Light Mode)

- Toggle di header (ikon sun/moon)
- CSS variables via atribut `[data-theme='dark']`
- Design tokens di `assets/css/theme.css`
- Disimpan di localStorage

| Token | Light | Dark |
|-------|-------|------|
| Primary | `#1f7a4d` | `#1f7a4d` |
| Accent | `#5cc98c` | `#5cc98c` |
| Background | `#ffffff` | `#1a1a2e` |
| Surface | `#f8f9fa` | `#16213e` |
| Text | `#1a1a2e` | `#e8e8e8` |

Font: Inter (400–800), Border radius: 10–16px, Icons: Custom SVG via AppIcon (Lucide-style, stroke 1.8)

### Navigasi

**Header:** Home | Katalog | Blogs (external: ngopidulur.my.id/blog/)

**Footer:** Deskripsi brand + ikon sosial (WhatsApp, GitHub, Email dari activeChannel)

### FAQ

Section FAQ di homepage dengan accordion Nuxt UI-style (single-open, animasi `grid-template-rows`).

---

## 7. Testing

### Ringkasan

| Layer | Runner | Library PBT | Pola Unit Test | Pola PBT |
|-------|--------|-------------|----------------|----------|
| Backend | Jest + ts-jest | fast-check 3.x | `*.spec.ts` | `*.pbt.spec.ts` |
| Frontend | Vitest | fast-check 4.x | `*.test.ts` | `*.pbt.spec.ts` |

### Perintah

```bash
# Backend — semua test
cd backend && npm test

# Backend — watch mode
cd backend && npm run test:watch

# Backend — hanya PBT
cd backend && npm run test:pbt

# Frontend — semua test (single run)
cd frontend && npm run test

# Frontend — watch mode
cd frontend && npm run test:watch
```

### Konvensi Test

1. **Co-location**: Test ditempatkan di samping file sumbernya (bukan di folder `__tests__` terpisah)
2. **Property-based testing**: Gunakan fast-check arbitraries, hindari fixture buatan tangan
3. **Satu property per `it` block**: Jaga properti tetap sederhana
4. **Reproduksi seed**: fast-check melaporkan seed saat gagal untuk reproduksi

```
services/
├── digital-fulfillment.service.ts
├── digital-fulfillment.service.spec.ts      # Unit test
└── digital-fulfillment.service.pbt.spec.ts  # Property-based test
```

### Kapan Menulis PBT

- State machine (transisi order process)
- Transformasi data (format harga, matematika currency)
- Logika validasi (verifikasi signature, rate limiting)
- Access control (permission download, pengecekan kepemilikan)
- Apapun dengan domain input yang kompleks

### Contoh PBT Backend

```typescript
'use strict';
const fc = require('fast-check');

describe('Custom Order Process (PBT)', () => {
  it('tidak boleh ada transisi mundur', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('AddingItems', 'ArrangingPayment', 'PaymentSettled', 'Delivered'),
        fc.constantFrom('AddingItems', 'ArrangingPayment', 'PaymentSettled', 'Delivered'),
        (fromState, toState) => {
          const stateOrder = ['AddingItems', 'ArrangingPayment', 'PaymentSettled', 'Delivered'];
          const fromIdx = stateOrder.indexOf(fromState);
          const toIdx = stateOrder.indexOf(toState);
          if (toIdx < fromIdx) {
            expect(isValidTransition(fromState, toState)).toBe(false);
          }
        }
      )
    );
  });
});
```

### Contoh PBT Frontend

```typescript
import * as fc from 'fast-check';
import { formatPrice } from './format-price';

describe('formatPrice (PBT)', () => {
  it('harus selalu mengembalikan string yang diawali Rp', () => {
    fc.assert(
      fc.property(fc.nat(), (amount) => {
        return formatPrice(amount).startsWith('Rp');
      })
    );
  });
});
```

### Integration Test

Test integrasi backend ada di `backend/src/plugins/integration/`. Test ini menguji interaksi antar-plugin dan alur request lengkap.
