import { createContext, useContext } from 'react'

// { preference: 'system' | 'light' | 'dark', setPreference, theme: 'light' | 'dark' }
export const ThemeContext = createContext({
  preference: 'system',
  setPreference: () => {},
  theme: 'light',
})

export const useTheme = () => useContext(ThemeContext)
