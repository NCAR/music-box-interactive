import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './themeContext'
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  saveThemePreference,
  watchSystemTheme,
} from './theme'

// Holds the theme choice and keeps the "dark" class on <html> in sync with it.
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readThemePreference)
  const [theme, setTheme] = useState(() => resolveTheme(readThemePreference()))

  useEffect(() => {
    setTheme(resolveTheme(preference))
    saveThemePreference(preference)
    if (preference !== 'system') return undefined
    return watchSystemTheme(setTheme)
  }, [preference])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const value = useMemo(() => ({ preference, setPreference, theme }), [preference, theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
