<template>
  <!-- Skeleton state: pass no product -->
  <div v-if="!product" class="product-card skeleton" aria-hidden="true">
    <div class="thumb skeleton-box" />
    <div class="card-body">
      <div class="skeleton-line short" />
      <div class="skeleton-line" />
      <div class="skeleton-line tiny" />
    </div>
  </div>

  <!-- Real card -->
  <article v-else class="product-card">
    <NuxtLink :to="`/products/${product.slug}`" class="thumb" :aria-label="`Lihat detail ${product.name}`">
      <img
        v-if="product.featuredAsset"
        :src="product.featuredAsset.preview"
        :alt="product.name"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="thumb-placeholder">
        <AppIcon name="code" :size="34" />
      </div>
      <span v-if="badge" class="badge">{{ badge }}</span>
    </NuxtLink>

    <div class="card-body">
      <h3 class="card-name">
        <NuxtLink :to="`/products/${product.slug}`" class="card-name-link">
          {{ product.name }}
        </NuxtLink>
      </h3>

      <p v-if="showDescription && description" class="card-desc">{{ description }}</p>

      <div class="card-foot">
        <span class="card-price">
          <span v-if="pricePrefix" class="card-price-prefix">{{ pricePrefix }}</span>
          {{ priceLabel }}
        </span>
        <NuxtLink :to="`/products/${product.slug}`" class="card-link">
          Detail
          <AppIcon name="arrowRight" :size="15" />
        </NuxtLink>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '~/composables/useShop'
import { formatPriceIDR, truncateDescription } from '~/utils/format'

const props = withDefaults(
  defineProps<{
    /** Pass `null` to render a loading skeleton. */
    product: Product | null
    /** Optional badge text, e.g. the category label. */
    badge?: string | null
    /** Show the short description under the title. */
    showDescription?: boolean
  }>(),
  {
    badge: null,
    showDescription: true,
  },
)

const priceLabel = computed(() => {
  const p = props.product
  if (!p) return 'Lihat detail'
  // Multi-tier products: show the cheapest tier, prefixed with "mulai dari".
  const range = p.priceRange
  const price = range?.isRange ? range.min : p.variants?.[0]?.price
  return price != null ? formatPriceIDR(price) : 'Lihat detail'
})

/** Shown before the price when the product has several differently-priced tiers. */
const pricePrefix = computed(() =>
  props.product?.priceRange?.isRange ? 'mulai dari' : '',
)

const description = computed(() => {
  const p = props.product
  if (!p) return ''
  return truncateDescription(p.customFields?.shortDescription || p.description || '', 110)
})
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 2px var(--shadow-card);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: var(--btn-ghost-border);
  box-shadow: 0 14px 32px var(--shadow-card-strong);
}

.thumb {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .thumb img {
  transform: scale(1.04);
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--placeholder-icon);
}

.badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: var(--primary);
  color: var(--primary-contrast);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.1rem;
  flex: 1;
}

.card-name {
  font-size: 1.02rem;
  font-weight: 600;
  margin: 0;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.7em;
}

.card-name-link {
  color: inherit;
  text-decoration: none;
}

.card-desc {
  font-size: 0.86rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.75rem;
}

.card-price {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--primary-text);
  /* Tabular figures keep prices from shifting width between cards. */
  font-variant-numeric: tabular-nums;
}

.card-price-prefix {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.card-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  /* Keeps the tap target at the 44px minimum */
  min-height: 44px;
  padding: 0.35rem 0.7rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary-text);
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.18s ease;
}

.card-link:hover {
  background: var(--primary-soft);
}

/* Visible keyboard focus (WCAG) */
.thumb:focus-visible,
.card-name-link:focus-visible,
.card-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Skeleton */
.skeleton {
  pointer-events: none;
}

.skeleton-box {
  background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-line {
  height: 0.7rem;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--skeleton-a) 25%, var(--skeleton-b) 50%, var(--skeleton-a) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-line.short {
  width: 55%;
}

.skeleton-line.tiny {
  width: 35%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-card,
  .thumb img {
    transition: none;
  }

  .product-card:hover {
    transform: none;
  }

  .skeleton-box,
  .skeleton-line {
    animation: none;
  }
}

/* Compact card on small screens (two-up grids) */
@media (max-width: 540px) {
  .card-body {
    padding: 0.75rem;
    gap: 0.3rem;
  }

  .card-name {
    font-size: 0.88rem;
    min-height: unset;
  }

  .card-desc {
    font-size: 0.78rem;
  }

  .card-price {
    font-size: 0.9rem;
  }

  .card-link {
    font-size: 0.78rem;
    padding: 0.3rem 0.45rem;
  }

  .badge {
    font-size: 0.6rem;
    padding: 0.2rem 0.5rem;
    top: 0.5rem;
    left: 0.5rem;
  }
}
</style>
