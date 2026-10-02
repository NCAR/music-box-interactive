// The color theme. The user chooses 'system', 'light' or 'dark'; 'system' follows the
// prefers-color-scheme setting of the operating system, also when it changes. The choice is
// saved in localStorage. The resolved theme is the "dark" class on <html>, which the dark
// CSS variables in index.css and the Tailwind dark: variants key on. index.html applies the
// same rules in an inline script before the first paint, so a dark page never flashes white.

export const THEME_STORAGE_KEY = 'musicbox.themePreference'
export const THEME_PREFERENCES = ['system', 'light', 'dark']

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function readThemePreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_PREFERENCES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function saveThemePreference(preference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage can be blocked (private windows). The choice then lasts for this page only.
  }
}

export const systemPrefersDark = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches

export const resolveTheme = (preference) =>
  preference === 'light' || preference === 'dark'
    ? preference
    : systemPrefersDark()
      ? 'dark'
      : 'light'

export function applyTheme(theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

// Calls `onChange` when the system setting changes. Returns the function that stops it.
export function watchSystemTheme(onChange) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_QUERY)
  const listener = () => onChange(query.matches ? 'dark' : 'light')
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
