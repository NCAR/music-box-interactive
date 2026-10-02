import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent } from '@testing-library/react'

import mechanismReducer, {
  selectNamedReactions,
  setConfig,
} from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'

// Every species property can change after the species is added (#635), its name too.

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const MOLECULAR_WEIGHT = 'molecular weight [kg mol-1]'

const renderEditor = () => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  store.dispatch(
    setConfig({
      mechanism: {
        species: [{ name: 'A' }, { name: 'B' }],
        phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }] }],
        reactions: [
          { id: 'r1', type: 'ARRHENIUS', reactants: [{ name: 'A' }], products: [{ name: 'B' }] },
        ],
      },
    })
  )
  render(
    <Provider store={store}>
      <SpeciesEditor />
    </Provider>
  )
  fireEvent.click(screen.getByRole('button', { name: 'A' }))
  return store
}

const speciesNamed = (store, name) =>
  store.getState().mechanism.config.mechanism.species.find((s) => s.name === name)

// The input under a property label of the open chip.
const propertyInput = (label) =>
  screen
    .getAllByText(label)
    .map((element) => element.parentElement.querySelector('input'))
    .find(Boolean)

describe('editing a species chip', () => {
  it('shows an unset property, so that it can be set', () => {
    const store = renderEditor()
    const input = propertyInput('Molecular weight (kg/mol)')
    expect(input.value).toBe('')

    fireEvent.change(input, { target: { value: '0.048' } })
    fireEvent.blur(input)

    expect(speciesNamed(store, 'A')[MOLECULAR_WEIGHT]).toBe(0.048)
  })

  it('renames a species, and the reactions follow the rename', () => {
    const store = renderEditor()
    const input = screen.getByRole('textbox', { name: 'Name of A' })

    fireEvent.change(input, { target: { value: 'O3' } })
    fireEvent.blur(input)

    expect(speciesNamed(store, 'O3')).toBeDefined()
    expect(selectNamedReactions(store.getState())[0].reactants[0].name).toBe('O3')
  })

  it('rejects a name that another species has, and keeps the old name', () => {
    const store = renderEditor()
    const input = screen.getByRole('textbox', { name: 'Name of A' })

    fireEvent.change(input, { target: { value: 'B' } })
    fireEvent.blur(input)

    expect(speciesNamed(store, 'A')).toBeDefined()
    expect(input.value).toBe('A')
  })
})
