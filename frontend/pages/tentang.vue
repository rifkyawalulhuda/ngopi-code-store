<template>
  <div class="static-page">
    <TheHeader />
    <main class="static-main">
      <h1>Tentang Kami</h1>

      <section>
        <h2>Apa itu NgopiCode?</h2>
        <p>
          NgopiCode adalah platform toko digital yang menyediakan produk-produk digital berkualitas
          untuk developer dan pelajar di Indonesia. Kami menjual source code aplikasi, ebook pemrograman,
          template website, serta menyediakan layanan jasa pengembangan perangkat lunak.
        </p>
      </section>

      <section>
        <h2>Misi Kami</h2>
        <p>
          Membantu developer Indonesia mendapatkan sumber belajar dan produk digital siap pakai
          dengan harga terjangkau, pengiriman instan, dan kualitas terjamin. Kami percaya setiap
          developer berhak memiliki akses ke materi pembelajaran dan tools yang berkualitas.
        </p>
      </section>

      <section>
        <h2>Bagaimana Cara Kerjanya?</h2>
        <ol>
          <li>Pilih produk digital yang kamu butuhkan dari katalog kami.</li>
          <li>Lakukan pembayaran melalui channel yang tersedia (Virtual Account, E-Wallet, atau QRIS).</li>
          <li>Setelah pembayaran berhasil, produk langsung bisa diunduh dari Pustaka Digital kamu.</li>
          <li>Untuk layanan jasa, tim kami akan menghubungi kamu via WhatsApp setelah pembayaran terkonfirmasi.</li>
        </ol>
      </section>

      <section>
        <h2>Keunggulan Kami</h2>
        <ul>
          <li><strong>Pengiriman Instan</strong> — Produk digital langsung tersedia setelah pembayaran.</li>
          <li><strong>Pembayaran Aman</strong> — Transaksi diproses melalui Tripay, gateway pembayaran terpercaya di Indonesia.</li>
          <li><strong>Akses Seumur Hidup</strong> — Produk yang sudah dibeli bisa diunduh kapan saja tanpa batas waktu.</li>
          <li><strong>Dukungan Responsif</strong> — Tim kami siap membantu melalui WhatsApp.</li>
        </ul>
      </section>
    </main>
    <TheFooter />
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Tentang Kami - NgopiCode' })
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
  margin-bottom: 2rem;
}

.static-main h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 2rem 0 0.75rem;
}

.static-main p,
.static-main li {
  color: var(--text-muted);
  line-height: 1.7;
  font-size: 0.95rem;
}

.static-main ul,
.static-main ol {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.static-main li {
  margin-bottom: 0.5rem;
}

section {
  margin-bottom: 1.5rem;
}
</style>
