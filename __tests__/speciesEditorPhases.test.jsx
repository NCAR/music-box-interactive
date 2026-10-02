import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, within } from '@testing-library/react'

import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const renderEditor = (phases) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  store.dispatch(setConfig({ mechanism: { species: [], phases, reactions: [] } }))
  render(
    <Provider store={store}>
      <SpeciesEditor />
    </Provider>
  )
  return store
}

// The phase choices of the Add species dialog.
const addRowPhases = () => {
  if (!screen.queryByRole('dialog', { name: 'Add species' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Add species' }))
  }
  const addRow = screen.getByRole('table', { name: 'Add species' })
  fireEvent.click(within(addRow).getByRole('button', { expanded: false }))
  return screen.getAllByRole('option').map((option) => option.textContent.trim())
}

describe('species editor phase choices', () => {
  it("offers the mechanism's own phases, spelled as the mechanism spells them", () => {
    renderEditor([
      { name: 'gas', species: [] },
      { name: 'Organic_Aerosol', species: [] },
    ])
    expect(addRowPhases()).toEqual(['gas', 'Organic_Aerosol', 'New phase…'])
  })

  it('offers gas when the mechanism has no phase yet', () => {
    renderEditor([])
    expect(addRowPhases()).toEqual(['gas', 'New phase…'])
  })

  it('adds a species in a new phase', () => {
    const store = renderEditor([{ name: 'gas', species: [] }])
    addRowPhases()
    fireEvent.click(screen.getByRole('option', { name: 'New phase…' }))
    const phaseInput = screen.getByLabelText('Add phase')
    fireEvent.change(phaseInput, { target: { value: 'aqueous' } })
    fireEvent.keyDown(phaseInput, { key: 'Enter' })

    fireEvent.change(screen.getByPlaceholderText('species name'), { target: { value: 'SO4' } })
    fireEvent.keyDown(screen.getByPlaceholderText('species name'), { key: 'Enter' })

    const { phases } = store.getState().mechanism.config.mechanism
    expect(phases.map((p) => p.name)).toEqual(['gas', 'aqueous'])
    expect(phases[1].species).toHaveLength(1)
  })

  it('closes only the Add phase dialog on Escape, and keeps the Add species dialog open after an add', () => {
    renderEditor([{ name: 'gas', species: [] }])
    addRowPhases()
    fireEvent.click(screen.getByRole('option', { name: 'New phase…' }))
    const phaseInput = screen.getByLabelText('Add phase')
    phaseInput.focus()
    fireEvent.keyDown(phaseInput, { key: 'Escape' })
    expect(screen.queryByLabelText('Add phase')).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Add species' })).toBeInTheDocument()

    const name = screen.getByPlaceholderText('species name')
    fireEvent.change(name, { target: { value: 'O3' } })
    fireEvent.keyDown(name, { key: 'Enter' })
    // Still open, and cleared for the next species.
    expect(screen.getByRole('dialog', { name: 'Add species' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('species name')).toHaveValue('')
  })
})
