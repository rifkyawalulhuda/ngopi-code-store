<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <NuxtLink to="/" class="brand">
          <span class="brand-mark"><AppIcon name="terminal" :size="20" /></span>
          <span class="brand-name">Ngopi<span class="brand-accent">Code</span></span>
        </NuxtLink>
        <p class="footer-tagline">
          Produk digital premium dengan desain minimalis dan efisien. Kami membangun
          alat yang memberdayakan kreator dan developer.
        </p>
        <div class="footer-socials">
          <a href="#" class="social" aria-label="Terminal"><AppIcon name="terminal" :size="18" /></a>
          <a href="#" class="social" aria-label="Kode"><AppIcon name="code" :size="18" /></a>
          <a href="#" class="social" aria-label="Email"><AppIcon name="mail" :size="18" /></a>
        </div>
      </div>

      <div class="footer-col">
        <h3>Store</h3>
        <NuxtLink to="/products">Rilis Terbaru</NuxtLink>
        <NuxtLink to="/products?category=source-code">Source Code</NuxtLink>
        <NuxtLink to="/products?category=ebooks">Ebooks</NuxtLink>
        <NuxtLink to="/products?category=components">Components</NuxtLink>
      </div>

      <div class="footer-col">
        <h3>Services</h3>
        <NuxtLink to="/products?category=services">Web Dev</NuxtLink>
        <a href="#">Consulting</a>
        <a href="#">UI Design</a>
        <a href="#">Maintenance</a>
      </div>

      <div class="footer-col">
        <h3>Support</h3>
        <a href="#">Lisensi</a>
        <a href="#">Dokumentasi</a>
        <a href="#">Syarat &amp; Ketentuan</a>
        <a href="#">Kontak</a>
      </div>
    </div>

    <div class="footer-bottom">
      <p>© {{ year }} Ngopi Code Digital Assets. Hak cipta dilindungi.</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  background: #11201a;
  color: #c8d4cd;
  margin-top: 4rem;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3.5rem 1.25rem 2.5rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2.5rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: #fff;
  font-weight: 700;
  font-size: 1.2rem;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #1f7a4d;
  color: #fff;
}

.brand-accent {
  color: #5cc98c;
}

.footer-tagline {
  margin: 1rem 0 1.25rem;
  font-size: 0.9rem;
  line-height: 1.6;
  color: #93a69c;
  max-width: 360px;
}

.footer-socials {
  display: flex;
  gap: 0.6rem;
}

.social {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1b3128;
  color: #aebcb4;
  transition: background 0.18s, color 0.18s;
}

.social:hover {
  background: #1f7a4d;
  color: #fff;
}

.footer-col h3 {
  color: #fff;
  font-size: 0.95rem;
  margin: 0 0 1rem;
}

.footer-col a {
  display: block;
  color: #93a69c;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 0.35rem 0;
  transition: color 0.18s;
}

.footer-col a:hover {
  color: #5cc98c;
}

.footer-bottom {
  border-top: 1px solid #1d3329;
  padding: 1.5rem 1.25rem;
  text-align: center;
}

.footer-bottom p {
  margin: 0;
  font-size: 0.85rem;
  color: #7d8f86;
}

@media (max-width: 860px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
}

@media (max-width: 520px) {
  .footer-inner {
    grid-template-columns: 1fr;
  }
}
</style>
