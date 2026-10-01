import React from 'react'
import { describe, it, expect } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'

import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { loadMusicBoxConfig } from '../src/services/config/loadMusicBoxConfig'
import { EnvironmentTab } from '../src/components/Conditions/EnvironmentTab'

// Loading a configuration must show exactly what the file holds: no time-0 row is added, and no
// blank cell is filled in.
const load = async (data) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  await loadMusicBoxConfig(
    {
      'box model options': {
        'chemistry time step [sec]': 1,
        'output time step [sec]': 1,
        'simulation length [sec]': 10,
      },
      conditions: { data },
      mechanism: { name: 'Example', version: '1.0.0', species: [], phases: [], reactions: [] },
    },
    { dispatch: store.dispatch, navigate: () => {}, meta: { id: 'example-1', name: 'Example' } }
  )
  // Showing the conditions does not change them.
  render(
    <Provider store={store}>
      <EnvironmentTab />
    </Provider>
  )
  return store.getState().conditions.table
}

describe('loading a configuration', () => {
  it('adds no time-0 row when the file has none', async () => {
    const table = await load([
      {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
        rows: [
          [100, 300, 100000],
          [200, 310, 95000],
        ],
      },
    ])
    expect(table.times).toEqual([100, 200])
    expect(table.columns['ENV.temperature.K']).toEqual([300, 310])
    expect(table.columns['ENV.pressure.Pa']).toEqual([100000, 95000])
  })

  it('leaves a blank time-0 cell blank instead of filling it in', async () => {
    const table = await load([
      {
        headers: ['time.s', 'ENV.temperature.K', 'ENV.pressure.Pa'],
        rows: [
          [0, 300, null],
          [100, 310, 95000],
        ],
      },
    ])
    expect(table.times).toEqual([0, 100])
    expect(table.columns['ENV.temperature.K']).toEqual([300, 310])
    expect(table.columns['ENV.pressure.Pa']).toEqual([null, 95000])
  })
})
