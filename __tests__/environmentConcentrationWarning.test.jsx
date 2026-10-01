import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent } from '@testing-library/react'

import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import { EnvironmentTab } from '../src/components/Conditions/EnvironmentTab'
import { rowHasConcentrations } from '../src/services/conditions/table'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

describe('rowHasConcentrations', () => {
  const table = {
    times: [0, 100],
    columns: { 'CONC.O3': [1e-6, null], 'CONC.NO': [null, null], 'PHOTO.jNO2': [1, 1] },
  }

  it('is true when any species has a value in that row', () => {
    expect(rowHasConcentrations(table, 0)).toBe(true)
  })

  it('is false for a row with no concentrations, ignoring non-species series', () => {
    expect(rowHasConcentrations(table, 1)).toBe(false)
    expect(rowHasConcentrations(undefined, 0)).toBe(false)
  })
})

describe('environment edits that change how concentrations read in ppb', () => {
  beforeEach(() => toast.mockClear())

  const renderTab = () => {
    const store = configureStore({ reducer: { conditions: conditionsReducer } })
    // Row 0 has an O3 concentration; row 1 has none.
    store.dispatch(
      setConditionsTable({
        times: [0, 100],
        columns: {
          'ENV.temperature.K': [300, 310],
          'ENV.pressure.Pa': [100000, 100000],
          'CONC.O3': [1e-6, null],
        },
      })
    )
    const utils = render(
      <Provider store={store}>
        <EnvironmentTab />
      </Provider>
    )
    const rows = utils.container.querySelectorAll('tbody tr')
    const cells = (row) => rows[row].querySelectorAll('input[inputmode="decimal"]')
    return { store, cells }
  }

  const edit = (input, value) => {
    fireEvent.change(input, { target: { value } })
    fireEvent.blur(input)
  }

  it('warns when a row that holds concentrations gets a new temperature', () => {
    const { store, cells } = renderTab()
    edit(cells(0)[1], '320')

    expect(store.getState().conditions.table.columns['ENV.temperature.K'][0]).toBe(320)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][0].title).toBe('Concentrations stay in mol m-3')
  })

  it('warns when such a row gets a new pressure', () => {
    const { cells } = renderTab()
    edit(cells(0)[2], '95000')
    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('does not warn for a row without concentrations', () => {
    const { cells } = renderTab()
    edit(cells(1)[1], '320')
    expect(toast).not.toHaveBeenCalled()
  })

  it('does not warn when the value is unchanged', () => {
    const { cells } = renderTab()
    edit(cells(0)[1], '300')
    expect(toast).not.toHaveBeenCalled()
  })
})
