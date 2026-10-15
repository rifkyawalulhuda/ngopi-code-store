<template>
  <div class="filter-panel">
    <!-- Categories -->
    <section class="fp-section">
      <h2 class="fp-heading">Kategori</h2>
      <ul class="fp-list">
        <li v-for="c in categoryOptions" :key="c.value || 'all'">
          <button
            type="button"
            class="fp-option"
            :class="{ active: category === c.value }"
            :aria-pressed="category === c.value"
            @click="$emit('update:category', c.value)"
          >
            <span class="fp-option-label">{{ c.label }}</span>
            <span v-if="c.count != null" class="fp-option-count">{{ c.count }}</span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Search -->
    <section class="fp-section">
      <h2 class="fp-heading">
        <label :for="searchId">Pencarian</label>
      </h2>
      <div class="fp-search">
        <AppIcon name="search" :size="17" class="fp-search-icon" aria-hidden="true" />
        <input
          :id="searchId"
          type="search"
          class="fp-search-input"
          :value="search"
          placeholder="Cari produk…"
          autocomplete="off"
          @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <p class="fp-hint">Minimal 2 karakter.</p>
    </section>

    <!-- Price -->
    <section class="fp-section">
      <h2 class="fp-heading">Harga Maksimum</h2>
      <p class="fp-price-value" aria-live="polite">
        {{ priceMax >= priceCeiling ? 'Semua harga' : `≤ ${formatPrice(priceMax)}` }}
      </p>
      <input
        class="fp-range"
        type="range"
        min="0"
        :max="priceCeiling"
        :step="priceStep"
        :value="priceMax"
        aria-label="Harga maksimum"
        @input="$emit('update:price-max', Number(($event.target as HTMLInputElement).value))"
      />
      <div class="fp-range-labels" aria-hidden="true">
        <span>Rp 0</span>
        <span>{{ formatPrice(priceCeiling) }}+</span>
      </div>
    </section>

    <!-- Reset -->
    <button
      v-if="hasActiveFilters"
      type="button"
      class="fp-reset"
      @click="$emit('reset')"
    >
      <AppIcon name="close" :size="15" />
      Hapus semua filter
    </button>
  </div>
</template>

<script setup lang="ts">
import { formatPriceIDR } from '~/utils/format'

export interface CategoryOption {
  /** Empty string means "all products". */
  value: string
  label: string
  count?: number | null
}

const props = withDefaults(
  defineProps<{
    category: string
    search: string
    priceMax: number
    priceCeiling: number
    hasActiveFilters: boolean
    categoryOptions: CategoryOption[]
    priceStep?: number
    /** Distinguishes the sidebar and sheet instances for label/input ids. */
    idPrefix?: string
  }>(),
  {
    priceStep: 50_000,
    idPrefix: 'filter',
  },
)

defineEmits<{
  'update:category': [value: string]
  'update:search': [value: string]
  // Kebab-case keeps the listener name unambiguous in SFC templates.
  'update:price-max': [value: number]
  reset: []
}>()

const searchId = `${props.idPrefix}-search`

function formatPrice(value: number): string {
  return formatPriceIDR(value)
}
</script>

<style scoped>
.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.fp-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.fp-heading {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.fp-heading label {
  cursor: pointer;
}

/* Categories */
.fp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.fp-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  /* 44px keeps the tap target at the accessibility minimum */
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.fp-option:hover {
  background: var(--surface-2);
}

.fp-option.active {
  background: var(--primary-soft);
  /* --primary-hover is a darker green than --primary-text, lifting the active
     label contrast from ~4.6:1 (barely AA) to a comfortable margin. */
  color: var(--primary-hover);
  font-weight: 700;
}

.fp-option-label {
  min-width: 0;
  overflow-wrap: break-word;
}

.fp-option-count {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.fp-option.active .fp-option-count {
  color: var(--primary-hover);
}

/* Search */
.fp-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.75rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: var(--surface-2);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.fp-search:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.fp-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.fp-search-input {
  flex: 1;
  min-width: 0;
  /* 16px avoids iOS zoom-on-focus */
  font-size: 16px;
  font-family: inherit;
  color: var(--text);
  background: transparent;
  border: none;
  outline: none;
  padding: 0.7rem 0;
}

.fp-hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Price */
.fp-price-value {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary-text);
  font-variant-numeric: tabular-nums;
}

.fp-range {
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
}

.fp-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Reset */
.fp-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.fp-reset:hover {
  background: var(--surface-2);
  border-color: var(--primary);
}

.fp-option:focus-visible,
.fp-reset:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .fp-option,
  .fp-search,
  .fp-reset {
    transition: none;
  }
}
</style>
