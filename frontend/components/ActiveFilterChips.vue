<template>
  <ul v-if="chips.length" class="chips" aria-label="Filter aktif">
    <li v-for="chip in chips" :key="chip.key">
      <button
        type="button"
        class="chip"
        :aria-label="`Hapus filter ${chip.label}`"
        @click="$emit('remove', chip.key)"
      >
        <span class="chip-label">{{ chip.label }}</span>
        <span class="chip-x" aria-hidden="true">
          <AppIcon name="close" :size="13" />
        </span>
      </button>
    </li>
    <li v-if="chips.length > 1">
      <button type="button" class="chip chip-clear" @click="$emit('clear')">
        Hapus semua
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
export type FilterChipKey = 'category' | 'search' | 'priceMax'

export interface FilterChip {
  key: FilterChipKey
  label: string
}

defineProps<{ chips: FilterChip[] }>()

defineEmits<{
  remove: [key: FilterChipKey]
  clear: []
}>()
</script>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0 0 1.25rem;
  padding: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  /* 44px keeps the tap target at the accessibility minimum */
  min-height: 44px;
  padding: 0.35rem 0.85rem;
  border: 1px solid var(--primary);
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary-text);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.chip:hover {
  background: var(--primary);
  color: var(--primary-contrast);
}

.chip-label {
  max-width: 18ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-x {
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.chip-clear {
  border-color: var(--border-strong);
  background: transparent;
  color: var(--text-muted);
}

.chip-clear:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
  color: var(--text);
}

.chip:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .chip {
    transition: none;
  }
}
</style>
