<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'

// Read theme from cookie and apply it to <html> during SSR so the
// correct palette is present on the very first paint (no flash).
const { theme } = useTheme()

useHead({
  htmlAttrs: {
    'data-theme': theme,
  },
})
</script>
