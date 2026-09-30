import React from 'react'
import { describe, it, expect } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'

import mechanismReducer, { setCurrentExample } from '../src/redux/slices/mechanismSlice'
import conditionsReducer, { setConditions } from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { MechanismPage } from '../src/components/pages/MechanismPage'

// Loading a configuration must show exactly what the file holds: no time-0 row is added, and no
// blank cell is filled in.
const load = (data) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  store.dispatch(setConditions({ data }))
  store.dispatch(setCurrentExample({ id: 'example-1', name: 'Example' }))
  render(
    <Provider store={store}>
      <MechanismPage />
    </Provider>
  )
  return store.getState().conditions.evolving
}

describe('loading a configuration', () => {
  it('adds no time-0 row when the file has none', () => {
    const evolving = load([
      {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
        rows: [
          [100, 300, 100000],
          [200, 310, 95000],
        ],
      },
    ])
    expect(evolving.times).toEqual([100, 200])
    expect(evolving.temperature).toEqual([300, 310])
    expect(evolving.pressure).toEqual([100000, 95000])
  })

  it('leaves a blank time-0 cell blank instead of filling it in', () => {
    const evolving = load([
      {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
        rows: [
          [0, 300, null],
          [100, 310, 95000],
        ],
      },
    ])
    expect(evolving.times).toEqual([0, 100])
    expect(evolving.temperature).toEqual([300, 310])
    expect(evolving.pressure).toEqual([null, 95000])
  })
})
