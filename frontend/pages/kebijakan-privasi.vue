<template>
  <div class="static-page">
    <TheHeader />
    <main class="static-main">
      <h1>Kebijakan Privasi</h1>
      <p class="updated">Terakhir diperbarui: Juni 2026</p>

      <section>
        <h2>1. Informasi yang Kami Kumpulkan</h2>
        <p>Saat Anda mendaftar dan menggunakan layanan NgopiCode, kami mengumpulkan:</p>
        <ul>
          <li><strong>Data akun:</strong> nama, alamat email, dan metode autentikasi (Google/GitHub).</li>
          <li><strong>Data transaksi:</strong> riwayat pembelian, metode pembayaran yang dipilih, dan status pesanan.</li>
          <li><strong>Data teknis:</strong> alamat IP, jenis browser, dan halaman yang dikunjungi untuk keperluan keamanan dan peningkatan layanan.</li>
        </ul>
      </section>

      <section>
        <h2>2. Penggunaan Informasi</h2>
        <p>Informasi yang kami kumpulkan digunakan untuk:</p>
        <ul>
          <li>Memproses dan mengirimkan pesanan produk digital Anda.</li>
          <li>Mengirim email konfirmasi transaksi dan verifikasi akun.</li>
          <li>Mencegah penipuan dan menjaga keamanan platform.</li>
          <li>Meningkatkan kualitas layanan dan pengalaman pengguna.</li>
        </ul>
      </section>

      <section>
        <h2>3. Penyimpanan dan Keamanan Data</h2>
        <p>
          Data Anda disimpan di server yang aman dengan enkripsi. Kami tidak menyimpan informasi
          kartu kredit atau detail pembayaran — seluruh proses pembayaran ditangani oleh Tripay
          sebagai payment gateway pihak ketiga yang tersertifikasi.
        </p>
      </section>

      <section>
        <h2>4. Berbagi Data dengan Pihak Ketiga</h2>
        <p>Kami <strong>tidak menjual</strong> data pribadi Anda. Data hanya dibagikan kepada:</p>
        <ul>
          <li><strong>Tripay</strong> — untuk memproses pembayaran.</li>
          <li><strong>Resend</strong> — untuk mengirim email transaksional (konfirmasi pesanan, verifikasi akun).</li>
          <li><strong>Google/GitHub</strong> — untuk autentikasi OAuth (hanya jika Anda memilih login melalui layanan tersebut).</li>
        </ul>
      </section>

      <section>
        <h2>5. Hak Pengguna</h2>
        <p>Anda berhak untuk:</p>
        <ul>
          <li>Mengakses dan memperbarui data profil Anda melalui halaman pengaturan akun.</li>
          <li>Menghapus akun Anda dengan menghubungi tim support kami.</li>
          <li>Meminta salinan data pribadi yang kami simpan.</li>
        </ul>
      </section>

      <section>
        <h2>6. Cookie</h2>
        <p>
          Kami menggunakan cookie untuk menjaga sesi login dan preferensi tema (terang/gelap).
          Kami tidak menggunakan cookie pelacakan iklan pihak ketiga.
        </p>
      </section>

      <section>
        <h2>7. Perubahan Kebijakan</h2>
        <p>
          Kami dapat memperbarui kebijakan privasi ini sewaktu-waktu. Perubahan signifikan akan
          diinformasikan melalui email atau notifikasi di website.
        </p>
      </section>

      <section>
        <h2>8. Kontak</h2>
        <p>
          Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, silakan hubungi kami melalui
          halaman <NuxtLink to="/kontak">Kontak</NuxtLink>.
        </p>
      </section>
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Kebijakan Privasi - NgopiCode' })
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
