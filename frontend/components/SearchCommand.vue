<template>
  <Teleport to="body">
    <transition name="cmd-backdrop">
      <div
        v-if="isOpen"
        class="cmd-backdrop"
        @click.self="close"
        @keydown.escape="close"
      >
        <transition name="cmd-panel" appear>
          <div
            v-if="isOpen"
            class="cmd-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian produk"
          >
            <!-- Search input -->
            <div class="cmd-input-wrap">
              <AppIcon name="search" :size="20" class="cmd-input-icon" />
              <input
                ref="inputRef"
                v-model="query"
                type="search"
                class="cmd-input"
                placeholder="Cari produk, source code, ebook..."
                autocomplete="off"
                @input="onInput"
                @keydown.down.prevent="moveDown"
                @keydown.up.prevent="moveUp"
                @keydown.enter.prevent="selectCurrent"
              />
              <kbd class="cmd-kbd" aria-hidden="true">ESC</kbd>
            </div>

            <!-- Results -->
            <div class="cmd-results" role="listbox" aria-label="Hasil pencarian">
              <!-- Loading -->
              <div v-if="loading" class="cmd-state">
                <div class="cmd-spinner" />
                <span>Mencari...</span>
              </div>

              <!-- Empty state -->
              <div v-else-if="query.length >= 2 && !results.length && searched" class="cmd-state">
                <AppIcon name="search" :size="24" class="cmd-state-icon" />
                <span>Tidak ada hasil untuk "{{ query }}"</span>
              </div>

              <!-- Hint -->
              <div v-else-if="query.length < 2 && !results.length" class="cmd-state cmd-hint">
                <AppIcon name="search" :size="24" class="cmd-state-icon" />
                <span>Ketik minimal 2 karakter untuk mencari</span>
              </div>

              <!-- Result items -->
              <template v-else>
                <button
                  v-for="(item, idx) in results"
                  :key="item.slug"
                  type="button"
                  class="cmd-item"
                  :class="{ active: idx === activeIndex }"
                  role="option"
                  :aria-selected="idx === activeIndex"
                  @click="goToProduct(item.slug)"
                  @mouseenter="activeIndex = idx"
                >
                  <div class="cmd-item-thumb">
                    <img
                      v-if="item.image"
                      :src="item.image"
                      :alt="item.name"
                      loading="lazy"
                    />
                    <AppIcon v-else name="code" :size="20" />
                  </div>
                  <div class="cmd-item-body">
                    <span class="cmd-item-name">{{ item.name }}</span>
                    <span v-if="item.price" class="cmd-item-price">{{ item.price }}</span>
                  </div>
                  <AppIcon name="arrowRight" :size="16" class="cmd-item-arrow" />
                </button>
              </template>
            </div>

            <!-- Footer -->
            <div class="cmd-footer">
              <span class="cmd-footer-hint">
                <kbd>↑↓</kbd> navigasi
                <kbd>↵</kbd> pilih
                <kbd>esc</kbd> tutup
              </span>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { SEARCH_PRODUCTS } from '~/graphql/queries/products'
import { formatPriceIDR } from '~/utils/format'

interface SearchResult {
  name: string
  slug: string
  image: string | null
  price: string | null
}

const isOpen = ref(false)
const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const searched = ref(false)
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const router = useRouter()

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function open() {
  isOpen.value = true
  query.value = ''
  results.value = []
  searched.value = false
  activeIndex.value = 0
  nextTick(() => {
    inputRef.value?.focus()
  })
  if (import.meta.client) document.body.style.overflow = 'hidden'
}

function close() {
  isOpen.value = false
  if (import.meta.client) document.body.style.overflow = ''
}

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (query.value.length < 2) {
    results.value = []
    searched.value = false
    return
  }
  debounceTimer = setTimeout(() => {
    performSearch()
  }, 300)
}

async function performSearch() {
  if (query.value.length < 2) return
  loading.value = true
  searched.value = false
  try {
    const { $apollo } = useNuxtApp()
    const { data } = await $apollo.defaultClient.query({
      query: SEARCH_PRODUCTS,
      variables: {
        input: {
          term: query.value,
          groupByProduct: true,
          take: 8,
        },
      },
      fetchPolicy: 'no-cache',
    })

    results.value = (data.search.items || []).map((item: any) => {
      const price = item.price?.value ?? item.price?.min ?? null
      return {
        name: item.productName,
        slug: item.slug,
        image: item.productAsset?.preview || null,
        price: price != null ? formatPriceIDR(price) : null,
      }
    })
    activeIndex.value = 0
  } catch {
    results.value = []
  } finally {
    loading.value = false
    searched.value = true
  }
}

function moveDown() {
  if (results.value.length === 0) return
  activeIndex.value = (activeIndex.value + 1) % results.value.length
}

function moveUp() {
  if (results.value.length === 0) return
  activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
}

function selectCurrent() {
  if (results.value.length === 0) return
  const item = results.value[activeIndex.value]
  if (item) goToProduct(item.slug)
}

function goToProduct(slug: string) {
  close()
  router.push(`/products/${slug}`)
}

// Keyboard shortcut: Ctrl+K or Cmd+K to open
function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', onGlobalKeydown)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onGlobalKeydown)
  }
  if (debounceTimer) clearTimeout(debounceTimer)
})

// Expose open/close for parent
defineExpose({ open, close, isOpen })
</script>

<style scoped>
/* Backdrop */
.cmd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: min(20vh, 140px);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

/* Panel */
.cmd-panel {
  width: 100%;
  max-width: 580px;
  margin: 0 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 480px;
}

/* Input area */
.cmd-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.cmd-input-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.cmd-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 1rem;
  font-family: inherit;
  outline: none;
}

.cmd-input::placeholder {
  color: var(--placeholder-icon);
}

.cmd-input::-webkit-search-cancel-button {
  display: none;
}

.cmd-kbd {
  font-size: 0.72rem;
  font-family: inherit;
  padding: 0.2rem 0.45rem;
  border-radius: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-weight: 500;
}

/* Results */
.cmd-results {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  min-height: 120px;
}

/* States */
.cmd-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2rem 1rem;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.cmd-state-icon {
  opacity: 0.5;
}

.cmd-hint {
  flex-direction: column;
  gap: 0.5rem;
}

.cmd-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: cmd-spin 0.6s linear infinite;
}

@keyframes cmd-spin {
  to { transform: rotate(360deg); }
}

/* Result items */
.cmd-item {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  color: var(--text);
  transition: background 0.12s;
}

.cmd-item:hover,
.cmd-item.active {
  background: var(--surface-2);
}

.cmd-item.active {
  outline: 2px solid var(--primary-soft);
}

.cmd-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--placeholder-icon);
}

.cmd-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cmd-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.cmd-item-name {
  font-size: 0.92rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmd-item-price {
  font-size: 0.82rem;
  color: var(--primary-text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cmd-item-arrow {
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.cmd-item:hover .cmd-item-arrow,
.cmd-item.active .cmd-item-arrow {
  opacity: 1;
}

/* Footer */
.cmd-footer {
  padding: 0.65rem 1.25rem;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cmd-footer-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cmd-footer-hint kbd {
  font-size: 0.72rem;
  font-family: inherit;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-muted);
  margin-right: 0.2rem;
}

/* Animations */
.cmd-backdrop-enter-active,
.cmd-backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.cmd-backdrop-enter-from,
.cmd-backdrop-leave-to {
  opacity: 0;
}

.cmd-panel-enter-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cmd-panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.cmd-panel-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
}

.cmd-panel-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(-4px);
}

/* Responsive */
@media (max-width: 540px) {
  .cmd-backdrop {
    padding-top: 0;
    align-items: flex-start;
  }

  .cmd-panel {
    max-width: 100%;
    margin: 0;
    border-radius: 0 0 16px 16px;
    max-height: 70vh;
  }

  .cmd-footer-hint {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cmd-backdrop-enter-active,
  .cmd-backdrop-leave-active,
  .cmd-panel-enter-active,
  .cmd-panel-leave-active {
    transition: none;
  }
  .cmd-spinner {
    animation: none;
  }
}
</style>
