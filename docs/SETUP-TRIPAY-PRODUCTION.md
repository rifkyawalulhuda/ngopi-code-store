# Panduan Setting Tripay untuk Production

Dokumen ini menjelaskan cara mengubah konfigurasi pembayaran Tripay dari **sandbox** ke **production** pada NgopiCode Digital Store.

## Konsep Penting

Tripay dikonfigurasi di **DUA tempat** yang harus sinkron:

1. **Payment method handler** (di Vendure Dashboard) — dipakai `TripayService` untuk **membuat transaksi** (create payment, redirect ke halaman bayar).
2. **Environment variables** (`backend/.env`) — dipakai webhook middleware untuk **verifikasi HMAC signature** saat menerima callback pembayaran.

Keduanya punya flag sandbox terpisah. **Jika tidak konsisten** (mis. `.env` production tapi dashboard masih sandbox), pembayaran akan gagal atau tidak ter-fulfill.

| Mode | Base URL Tripay | Perilaku Webhook |
|------|-----------------|------------------|
| Sandbox (`true`) | `https://tripay.co.id/api-sandbox` | Signature mismatch hanya di-warning, tetap diproses |
| Production (`false`) | `https://tripay.co.id/api` | Signature mismatch ditolak (401) |

---

## Langkah 1 — Aktifkan Akun Tripay Production

1. Login ke **https://tripay.co.id** (akun production, bukan sandbox)
2. Lengkapi proses **verifikasi merchant** (KYC, data usaha) — wajib agar bisa menerima pembayaran real
3. Setelah disetujui, buka **Merchant → API & Callback** untuk mendapat kredensial production:
   - **API Key** (production)
   - **Private Key** (production)
   - **Merchant Code** (production, format `Txxxxx`)

> Kredensial production **berbeda** dari sandbox. Kredensial sandbox biasanya berawalan `DEV-`.

---

## Langkah 2 — Set Callback & Return URL di Situs Tripay

Di **Merchant → API & Callback** pada situs Tripay:

| Field | Value |
|-------|-------|
| **URL Callback** | `https://api.ngopicode.com/payments/tripay/webhook` |
| **URL Return** | `https://ngopicode.com/order` |

Simpan. Ini wajib agar Tripay tahu ke mana mengirim notifikasi pembayaran.

---

## Langkah 3 — Update Environment Variables di Server

```bash
nano ~/ngopi-code-store/backend/.env
```

Ubah ke kredensial production dan matikan sandbox:

```env
TRIPAY_API_KEY=<API_KEY_PRODUCTION>
TRIPAY_PRIVATE_KEY=<PRIVATE_KEY_PRODUCTION>
TRIPAY_MERCHANT_CODE=<MERCHANT_CODE_PRODUCTION>
TRIPAY_SANDBOX=false
TRIPAY_CALLBACK_URL=https://api.ngopicode.com/payments/tripay/webhook
TRIPAY_RETURN_URL=https://ngopicode.com/order
```

> **Penting**: `TRIPAY_SANDBOX=false` membuat webhook **menolak** request dengan signature salah (mode strict). Pastikan `TRIPAY_PRIVATE_KEY` benar-benar cocok dengan yang di akun Tripay.

Restart backend:

```bash
pm2 restart vendure
```

---

## Langkah 4 — Update Payment Method di Vendure Dashboard

Langkah ini sering terlewat. `TripayService` membaca kredensial dari **payment method config di dashboard**, BUKAN dari `.env`.

1. Buka `https://api.ngopicode.com/dashboard/`
2. **Settings → Payment methods** → pilih metode Tripay
3. Update field:

| Field | Value |
|-------|-------|
| **API Key** | `<API_KEY_PRODUCTION>` |
| **Private Key** | `<PRIVATE_KEY_PRODUCTION>` |
| **Merchant Code** | `<MERCHANT_CODE_PRODUCTION>` |
| **Sandbox mode** | **OFF / unchecked** |
| **Callback URL** | `https://api.ngopicode.com/payments/tripay/webhook` |
| **Return URL** | `https://ngopicode.com/order` |

4. **Save**

> Saat `Sandbox mode` OFF → base URL `https://tripay.co.id/api` (production). Saat ON → `https://tripay.co.id/api-sandbox`.

---

## Langkah 5 — Aktifkan Channel Pembayaran di Tripay

Di dashboard Tripay (**Merchant → Channel Pembayaran**), pastikan channel yang dipakai sudah **aktif**:

- Virtual Account: BRI, BNI, Mandiri, BCA
- E-Wallet: OVO, DANA, ShopeePay
- QRIS

Channel yang tidak aktif tidak akan muncul atau gagal saat checkout.

---

## Langkah 6 — Test Transaksi Real

1. Buka `https://ngopicode.com`, beli produk
2. Pilih channel pembayaran → harusnya redirect ke halaman Tripay **production**
3. Lakukan pembayaran (gunakan nominal kecil dulu untuk test)
4. Setelah bayar, Tripay mengirim webhook → cek log:
   ```bash
   pm2 logs vendure --lines 50
   ```
   Harus terlihat: webhook diterima → signature valid → order transition ke `Fulfilled`.
5. Cek order di dashboard berubah menjadi `Fulfilled` dan download link muncul di Pustaka customer.

---

## Checklist Ringkas: Sandbox → Production

| Item | Aksi |
|------|------|
| `.env` `TRIPAY_SANDBOX` | `true` → `false` |
| `.env` API Key / Private Key / Merchant Code | sandbox → production |
| Dashboard payment method — Sandbox mode | ON → OFF |
| Dashboard payment method — kredensial | sandbox → production |
| Callback URL (situs Tripay + dashboard) | `https://api.ngopicode.com/payments/tripay/webhook` |
| Return URL | `https://ngopicode.com/order` |
| Channel pembayaran di Tripay | aktif |
| Merchant terverifikasi (KYC) | selesai |
| Restart backend setelah ubah `.env` | `pm2 restart vendure` |

---

## Troubleshooting

| Masalah | Penyebab & Solusi |
|---------|-------------------|
| Webhook 401 "Invalid signature" | `TRIPAY_PRIVATE_KEY` di `.env` tidak cocok dengan yang di Tripay. Samakan. |
| Channel tidak muncul saat checkout | Channel belum diaktifkan di dashboard Tripay. |
| Redirect ke halaman sandbox | `Sandbox mode` di payment method dashboard masih ON, atau kredensial masih sandbox. |
| Order tidak jadi `Fulfilled` setelah bayar | Callback URL salah atau webhook tidak sampai. Cek `pm2 logs vendure`. |
| "Merchant not active" dari Tripay | Akun belum lolos verifikasi production (KYC). |
| Pembayaran inkonsisten | `.env` dan dashboard tidak sinkron (satu production, satu sandbox). Samakan keduanya. |

---

## Catatan Teknis

- **Webhook endpoint**: `POST /payments/tripay/webhook` (registered via `apiOptions.middleware` di `vendure-config.ts`).
- **Webhook idempotent**: Tripay mengirim callback duplikat; memproses pembayaran yang sama dua kali tidak boleh double-fulfill.
- **HMAC signature** diverifikasi dengan `crypto.timingSafeEqual` (constant-time, anti timing-attack).
- **Lookup order** berdasarkan `code` (= `merchant_ref`), bukan tabel `tripay_transaction`.
- **Sumber kode terkait**:
  - `backend/src/plugins/tripay-payment/services/tripay.service.ts` — base URL & create transaction
  - `backend/src/plugins/tripay-payment/tripay-payment-method.handler.ts` — config dashboard (sandbox flag, kredensial)
  - `backend/src/plugins/tripay-payment/middleware/tripay-webhook.middleware.ts` — verifikasi signature & fulfillment
