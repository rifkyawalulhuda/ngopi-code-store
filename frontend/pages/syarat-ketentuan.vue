<template>
  <div class="static-page">
    <TheHeader />
    <main class="static-main">
      <h1>Syarat &amp; Ketentuan</h1>
      <p class="updated">Terakhir diperbarui: Juni 2026</p>

      <section>
        <h2>1. Umum</h2>
        <p>
          Dengan mengakses dan menggunakan website NgopiCode (ngopicode.com), Anda menyetujui
          syarat dan ketentuan yang berlaku di bawah ini. Jika Anda tidak menyetujui salah satu
          ketentuan, harap tidak menggunakan layanan kami.
        </p>
      </section>

      <section>
        <h2>2. Akun Pengguna</h2>
        <ul>
          <li>Anda wajib mendaftar menggunakan akun Google atau GitHub yang valid.</li>
          <li>Anda bertanggung jawab menjaga keamanan akun Anda.</li>
          <li>Satu akun hanya boleh digunakan oleh satu orang.</li>
          <li>Kami berhak menonaktifkan akun yang melanggar ketentuan.</li>
        </ul>
      </section>

      <section>
        <h2>3. Produk Digital</h2>
        <ul>
          <li>Semua produk yang dijual adalah produk digital (source code, ebook, template).</li>
          <li>Produk dikirimkan secara otomatis dan instan setelah pembayaran berhasil.</li>
          <li>Produk dengan tipe pembelian "one-time" hanya bisa dibeli satu kali per akun.</li>
          <li>File produk dapat diunduh tanpa batas waktu melalui Pustaka Digital Anda.</li>
        </ul>
      </section>

      <section>
        <h2>4. Lisensi Penggunaan</h2>
        <ul>
          <li>Produk yang dibeli dilisensikan untuk penggunaan personal dan/atau komersial sesuai keterangan pada halaman produk.</li>
          <li>Anda <strong>tidak diperbolehkan</strong> mendistribusikan ulang, menjual kembali, atau membagikan file produk kepada pihak lain.</li>
          <li>Modifikasi produk untuk kebutuhan proyek Anda diperbolehkan.</li>
        </ul>
      </section>

      <section>
        <h2>5. Pembayaran</h2>
        <ul>
          <li>Semua harga dicantumkan dalam Rupiah (IDR).</li>
          <li>Pembayaran diproses melalui Tripay dengan channel: Virtual Account (BRI, BNI, Mandiri, BCA), E-Wallet (OVO, DANA, ShopeePay), dan QRIS.</li>
          <li>Pesanan yang belum dibayar akan otomatis dibatalkan setelah melewati batas waktu pembayaran.</li>
        </ul>
      </section>

      <section>
        <h2>6. Pengembalian Dana (Refund)</h2>
        <p>
          Karena produk bersifat digital dan langsung dapat diunduh setelah pembayaran, kami
          <strong>tidak menyediakan pengembalian dana (refund)</strong> kecuali dalam kondisi berikut:
        </p>
        <ul>
          <li>File produk tidak dapat diunduh karena kesalahan teknis dari sisi kami.</li>
          <li>Produk yang diterima berbeda secara signifikan dari deskripsi yang tercantum.</li>
        </ul>
        <p>Pengajuan refund dapat dilakukan melalui halaman <NuxtLink to="/kontak">Kontak</NuxtLink> maksimal 7 hari setelah pembelian.</p>
      </section>

      <section>
        <h2>7. Layanan Jasa</h2>
        <ul>
          <li>Untuk produk bertipe layanan/jasa, tim kami akan menghubungi Anda melalui WhatsApp setelah pembayaran terkonfirmasi.</li>
          <li>Ruang lingkup dan estimasi pengerjaan jasa akan didiskusikan terlebih dahulu.</li>
        </ul>
      </section>

      <section>
        <h2>8. Pembatasan Tanggung Jawab</h2>
        <p>
          NgopiCode menyediakan produk digital "sebagaimana adanya" (as-is). Kami tidak
          bertanggung jawab atas kerugian yang timbul dari penggunaan produk, termasuk
          namun tidak terbatas pada kehilangan data atau pendapatan.
        </p>
      </section>

      <section>
        <h2>9. Perubahan Ketentuan</h2>
        <p>
          Kami berhak memperbarui syarat dan ketentuan ini sewaktu-waktu. Penggunaan berkelanjutan
          atas layanan kami setelah perubahan dianggap sebagai persetujuan terhadap ketentuan yang diperbarui.
        </p>
      </section>
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Syarat & Ketentuan - NgopiCode' })
</script>

<style scoped>
.static-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
}

.static-main {
  flex: 1;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
}

.static-main h1 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.updated {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.static-main h2 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 2rem 0 0.75rem;
}

.static-main p,
.static-main li {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 0.95rem;
}

.static-main ul {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.static-main li {
  margin-bottom: 0.5rem;
}

.static-main a {
  color: var(--primary-text);
  text-decoration: underline;
}

section {
  margin-bottom: 1rem;
}
</style>
