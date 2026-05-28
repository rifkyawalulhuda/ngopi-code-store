<template>
  <div>
    <h1>NgopiCode Digital Store</h1>
    <p>Browse digital products for developers</p>
    <NuxtLink to="/products">Browse Products</NuxtLink>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'NgopiCode Digital Store',
  meta: [
    { name: 'description', content: 'Digital products for Indonesian developers - source code, ebooks, templates' },
  ],
})
</script>
