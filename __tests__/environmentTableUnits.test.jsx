import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen } from '@testing-library/react'

import conditionsReducer, {
  resetConditions,
  setConditionsTable,
} from '../src/redux/slices/conditionsSlice'
import { EnvironmentTab } from '../src/components/Conditions/EnvironmentTab'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

// The Environment table stores SI values. Each column shows and accepts its values in the unit
// that is selected in the form above the table.
const renderTab = () => {
  const store = configureStore({ reducer: { conditions: conditionsReducer } })
  store.dispatch(
    setConditionsTable({
      times: [0, 7200],
      columns: { 'ENV.temperature.K': [227, 227], 'ENV.pressure.Pa': [1197, 1197] },
    })
  )
  const { container, unmount } = render(
    <Provider store={store}>
      <EnvironmentTab />
    </Provider>
  )
  const cells = (row) =>
    container.querySelectorAll('tbody tr')[row].querySelectorAll('input[inputmode="decimal"]')
  const columns = () => store.getState().conditions.table.columns
  return { store, cells, columns, unmount }
}

const selectUnit = (current, next) => {
  fireEvent.click(screen.getByRole('button', { name: current }))
  fireEvent.click(screen.getByRole('button', { name: next }))
}

const edit = (input, value) => {
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('Environment table units', () => {
  it('shows each column in the selected unit', () => {
    const { cells } = renderTab()
    selectUnit('Seconds', 'Hours')
    selectUnit('K', '°C')
    selectUnit('Pa', 'hPa')

    expect(screen.getByRole('columnheader', { name: 'Time (hr)' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Temperature (°C)' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pressure (hPa)' })).toBeInTheDocument()
    expect(cells(1)[0]).toHaveValue('2')
    expect(cells(1)[1]).toHaveValue('-46.15')
    expect(cells(1)[2]).toHaveValue('11.97')
  })

  it('stores an edited cell in SI units', () => {
    const { store, cells, columns } = renderTab()
    selectUnit('Seconds', 'Hours')
    selectUnit('K', '°C')
    selectUnit('Pa', 'hPa')

    edit(cells(1)[1], '-50')
    edit(cells(1)[2], '20')
    edit(cells(1)[0], '3')

    expect(store.getState().conditions.table.times).toEqual([0, 10800])
    expect(columns()['ENV.temperature.K'][1]).toBeCloseTo(223.15)
    expect(columns()['ENV.pressure.Pa'][1]).toBe(2000)
  })

  it('does not change a value when the user leaves a cell without an edit', () => {
    const { cells, columns } = renderTab()
    selectUnit('Pa', 'atm')

    // 1197 Pa shows as the rounded 0.0118 atm, which is 1195.6 Pa.
    expect(cells(0)[2]).toHaveValue('0.0118')
    fireEvent.focus(cells(0)[2])
    fireEvent.blur(cells(0)[2])

    expect(columns()['ENV.pressure.Pa'][0]).toBe(1197)
  })
})

describe('saved Environment units', () => {
  it('keeps the selected units when the tab opens again', () => {
    const { store, unmount } = renderTab()
    selectUnit('Seconds', 'Days')
    selectUnit('Pa', 'hPa')
    unmount()

    render(
      <Provider store={store}>
        <EnvironmentTab />
      </Provider>
    )

    expect(screen.getByRole('columnheader', { name: 'Time (day)' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pressure (hPa)' })).toBeInTheDocument()
  })

  it('keeps the selected units when the conditions reset', () => {
    const { store } = renderTab()
    selectUnit('Pa', 'hPa')
    store.dispatch(resetConditions())

    expect(store.getState().conditions.environmentUnits.pressure).toBe('hPa')
  })
})
