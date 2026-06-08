type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'pwrdevs-theme'

function resolveSystemTheme() {
  if (!process.client) {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const selectedTheme = useState<ThemeMode>('theme:selected', () => 'system')
  const effectiveTheme = useState<'light' | 'dark'>('theme:effective', () => 'light')

  function applyRootTheme(theme: 'light' | 'dark') {
    if (!process.client) {
      return
    }

    const root = document.documentElement
    root.classList.remove('theme-light', 'theme-dark')
    root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light')
    effectiveTheme.value = theme
  }

  function applyTheme(mode: ThemeMode) {
    selectedTheme.value = mode

    if (!process.client) {
      return
    }

    localStorage.setItem(THEME_STORAGE_KEY, mode)
    const resolved = mode === 'system' ? resolveSystemTheme() : mode
    applyRootTheme(resolved)
  }

  function initTheme() {
    if (!process.client) {
      return
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    const mode: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system'

    applyTheme(mode)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemThemeChange = () => {
      if (selectedTheme.value === 'system') {
        applyRootTheme(resolveSystemTheme())
      }
    }

    media.addEventListener('change', onSystemThemeChange)

    onBeforeUnmount(() => {
      media.removeEventListener('change', onSystemThemeChange)
    })
  }

  return {
    applyTheme,
    effectiveTheme,
    initTheme,
    selectedTheme
  }
}
