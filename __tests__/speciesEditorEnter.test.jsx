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

describe('the Add species dialog', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Add species' }))
    const name = screen.getByPlaceholderText('species name')
    fireEvent.change(name, { target: { value: 'O3' } })
    fireEvent.keyDown(name, { key: 'Enter' })

    expect(store.getState().mechanism.config.mechanism.species.map((s) => s.name)).toEqual(['O3'])
    expect(name).toHaveValue('')
  })
})
