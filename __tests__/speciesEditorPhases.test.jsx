import React from 'react'
import { describe, it, expect } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'

import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { SpeciesEditor } from '../src/components/Mechanism/SpeciesEditor'

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
}

const phasePills = () =>
  Array.from(
    screen.getByText('Choose a phase').parentElement.querySelectorAll('button'),
    (button) => button.textContent.trim()
  )

describe('species editor phase pills', () => {
  it("offers the mechanism's own phases, spelled as the mechanism spells them", () => {
    renderEditor([
      { name: 'gas', species: [] },
      { name: 'Organic_Aerosol', species: [] },
    ])
    expect(phasePills()).toEqual(['gas', 'Organic_Aerosol', 'Others'])
  })

  it('offers gas when the mechanism has no phase yet', () => {
    renderEditor([])
    expect(phasePills()).toEqual(['gas', 'Others'])
  })
})
