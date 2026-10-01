import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen } from '@testing-library/react'

import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import { EnvironmentTab } from '../src/components/Conditions/EnvironmentTab'
import { SpeciesConcentrationTab } from '../src/components/Conditions/SpeciesConcentrationTab'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

// t=0 sets the environment and O3; t=60 sets only a rate parameter; t=120 sets only O3.
const table = {
  times: [0, 60, 120],
  columns: {
    'ENV.temperature.K': [300, null, null],
    'ENV.pressure.Pa': [100000, null, null],
    'CONC.O3.mol m-3': [1e-6, null, 2e-6],
    'PHOTO.j.s-1': [1, 2, null],
  },
}

const renderTab = (tab) => {
  const store = configureStore({ reducer: { conditions: conditionsReducer, mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism: { species: [{ name: 'O3' }], reactions: [] } }))
  store.dispatch(setConditionsTable(table))
  const utils = render(
    <Provider store={store}>
      {tab}
    </Provider>
  )
  const rowTimes = () =>
    [...utils.container.querySelectorAll('tbody tr')]
      .map((row) => row.querySelector('input[inputmode="decimal"]')?.value)
      .filter((value) => value !== undefined)
  return { store, rowTimes }
}

const hideUnset = () => fireEvent.click(screen.getByRole('checkbox', { name: /Hide unset rows/ }))

describe('Hide unset rows', () => {
  it('shows only the Environment rows that set an environment value', () => {
    const { rowTimes } = renderTab(<EnvironmentTab />)
    expect(rowTimes()).toEqual(['0', '60', '120'])
    hideUnset()
    expect(rowTimes()).toEqual(['0'])
    hideUnset()
    expect(rowTimes()).toEqual(['0', '60', '120'])
  })

  it('shows only the Species rows where a shown species has a value', () => {
    const { rowTimes } = renderTab(<SpeciesConcentrationTab />)
    expect(rowTimes()).toEqual(['0', '60', '120'])
    hideUnset()
    expect(rowTimes()).toEqual(['0', '120'])
  })

  it('explains in a tooltip why rows with unset cells exist', () => {
    renderTab(<EnvironmentTab />)
    const label = screen.getByRole('checkbox', { name: /Hide unset rows/ }).closest('label')
    expect(label).toHaveAttribute('title', expect.stringContaining('another condition has a value'))
  })

  it('removes only the selected rows that are shown', () => {
    const { store } = renderTab(<EnvironmentTab />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select condition at t=60s' }))
    hideUnset()
    // Changing the filter clears the selection, so the hidden t=60 row is not removed.
    expect(screen.queryByRole('button', { name: /Remove selected/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all conditions' }))
    fireEvent.click(screen.getByRole('button', { name: /Remove selected/ }))
    expect(store.getState().conditions.table.times).toEqual([60, 120])
  })
})
