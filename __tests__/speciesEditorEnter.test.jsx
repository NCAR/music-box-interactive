import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent } from '@testing-library/react'

import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

describe('the Add species form', () => {
  it('adds the species when the user presses Enter in the name field', () => {
    const store = configureStore({
      reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
    })
    store.dispatch(setConfig({ mechanism: { species: [], phases: [], reactions: [] } }))
    render(
      <Provider store={store}>
        <SpeciesEditor />
      </Provider>
    )

    const name = screen.getByPlaceholderText('species name')
    fireEvent.change(name, { target: { value: 'O3' } })
    fireEvent.keyDown(name, { key: 'Enter' })

    expect(store.getState().mechanism.config.mechanism.species.map((s) => s.name)).toEqual(['O3'])
    expect(name).toHaveValue('')
  })
})

describe('the Third body pill in the Add species form', () => {
  const renderEmptyEditor = () => {
    const store = configureStore({
      reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
    })
    store.dispatch(setConfig({ mechanism: { species: [], phases: [], reactions: [] } }))
    render(
      <Provider store={store}>
        <SpeciesEditor />
      </Provider>
    )
    return store
  }
  const addSpecies = (speciesName) => {
    fireEvent.change(screen.getByPlaceholderText('species name'), { target: { value: speciesName } })
    fireEvent.click(screen.getByRole('button', { name: 'Add species' }))
  }
  const speciesOf = (store) => store.getState().mechanism.config.mechanism.species

  it('makes the species a third body without a switch', () => {
    const store = renderEmptyEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Third body' }))
    expect(screen.queryByRole('switch', { name: 'Third body' })).not.toBeInTheDocument()

    addSpecies('M')

    expect(speciesOf(store).find((s) => s.name === 'M')['is third body']).toBe(true)
  })

  it('applies to one species only', () => {
    const store = renderEmptyEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Third body' }))
    addSpecies('M')
    addSpecies('O2')

    expect(speciesOf(store).find((s) => s.name === 'O2')).not.toHaveProperty('is third body')
  })

  it('stores no third-body property when the pill is not selected', () => {
    const store = renderEmptyEditor()
    addSpecies('O3')

    expect(speciesOf(store).find((s) => s.name === 'O3')).not.toHaveProperty('is third body')
  })
})
