import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { ThemeProvider } from '../src/theme/ThemeProvider'
import { SettingsDialog } from '../src/components/Settings/SettingsDialog'
import { THEME_STORAGE_KEY, readThemePreference, resolveTheme } from '../src/theme/theme'

// A matchMedia stand-in whose prefers-color-scheme answer the test can change.
function mockSystemTheme(initiallyDark) {
  let dark = initiallyDark
  const listeners = new Set()
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    get matches() {
      return query.includes('dark') ? dark : false
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  }))
  return {
    setDark(value) {
      dark = value
      listeners.forEach((listener) => listener())
    },
  }
}

// The test environment has no working localStorage, so each test gets an in-memory one.
function mockLocalStorage() {
  const items = new Map()
  const storage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
  }
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
}

const isDark = () => document.documentElement.classList.contains('dark')

const renderSettings = () =>
  render(
    <ThemeProvider>
      <SettingsDialog onClose={() => {}} />
    </ThemeProvider>
  )

describe('theme preference', () => {
  beforeEach(() => {
    mockLocalStorage()
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => {
    delete window.matchMedia
  })

  it('defaults to the system setting', () => {
    mockSystemTheme(true)
    expect(readThemePreference()).toBe('system')
    expect(resolveTheme('system')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('ignores a stored value that is not a choice', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readThemePreference()).toBe('system')
  })

  it('follows the system setting, also when it changes', () => {
    const system = mockSystemTheme(false)
    renderSettings()
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    expect(isDark()).toBe(false)

    act(() => system.setDark(true))
    expect(isDark()).toBe(true)
  })

  it('applies and saves a chosen theme, and ignores the system setting then', () => {
    const system = mockSystemTheme(false)
    renderSettings()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(isDark()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')

    fireEvent.click(screen.getByRole('radio', { name: 'Light' }))
    act(() => system.setDark(true))
    expect(isDark()).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('starts from the saved choice', () => {
    mockSystemTheme(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderSettings()
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(isDark()).toBe(true)
  })
})
