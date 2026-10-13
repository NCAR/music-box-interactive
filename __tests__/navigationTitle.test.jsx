import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, fireEvent } from '@testing-library/react'

import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { Navigation } from '../src/components/Navigation'

// Vite defines the version at build time.
vi.stubGlobal('__APP_VERSION__', 'test')

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const renderAt = (path) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Navigation />
        <Routes>
          <Route path="/" element={<p>home page</p>} />
          <Route path="/conditions" element={<p>conditions page</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

describe('the sidebar', () => {
  it('goes back to the home page when the title is clicked', () => {
    renderAt('/conditions')
    expect(screen.getByText('conditions page')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Music Box Interactive' }))
    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('opens the settings dialog from the Settings row', () => {
    renderAt('/')
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Color theme' })).toBeInTheDocument()
  })
})
