import { computed } from 'vue'

export type ThemeMode = 'light' | 'dark'

/**
 * Theme state backed by a cookie so it is SSR-safe (no flash of wrong theme
 * on reload). The cookie value is read on the server and applied to the
 * <html data-theme> attribute via useHead, then kept in sync on the client.
 */
export function useTheme() {
  const themeCookie = useCookie<ThemeMode>('theme', {
    default: () => 'light',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  const theme = computed<ThemeMode>(() => themeCookie.value || 'light')
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(mode: ThemeMode) {
    themeCookie.value = mode
    if (import.meta.client) {
      document.documentElement.setAttribute('data-theme', mode)
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme, isDark, setTheme, toggleTheme }
}
