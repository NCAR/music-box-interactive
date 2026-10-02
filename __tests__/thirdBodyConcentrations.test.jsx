import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen } from '@testing-library/react'

import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import { SpeciesConcentrationTab } from '../src/components/Conditions/SpeciesConcentrationTab'
import { listConditionItems } from '../src/services/conditions/conditionItems'
import {
  buildConditionsUpload,
  parseConditionsCsv,
} from '../src/services/conditions/importConditions'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const species = [
  { id: 's-m', name: 'M', 'is third body': true },
  { id: 's-o3', name: 'O3' },
  { id: 's-o2', name: 'O2' },
]

const renderTab = () => {
  const store = configureStore({ reducer: { conditions: conditionsReducer, mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism: { species, reactions: [] } }))
  store.dispatch(setConditionsTable({ times: [0], columns: {} }))
  render(
    <Provider store={store}>
      <SpeciesConcentrationTab />
    </Provider>
  )
}

const columnHeaders = () => screen.queryAllByRole('columnheader').map((th) => th.textContent)

describe('third-body species in the Species tab', () => {
  it('shows a third-body species greyed out, with a tooltip, and never selects it', () => {
    renderTab()
    const m = screen.getByRole('button', { name: 'M' })
    expect(m).toBeDisabled()
    expect(m).toHaveAttribute('title', expect.stringContaining('third-body species'))

    // The default selection and Select all skip it.
    expect(columnHeaders()).not.toContain('M')
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }))
    expect(columnHeaders()).not.toContain('M')
    expect(columnHeaders()).toEqual(expect.arrayContaining(['O3', 'O2']))
  })

  it('still finds a third-body species with the search', () => {
    renderTab()
    fireEvent.change(screen.getByPlaceholderText('Search by name'), { target: { value: 'm' } })
    expect(screen.getByRole('button', { name: 'M' })).toBeDisabled()
  })
})

describe('third-body species in the conditions download and upload', () => {
  it('has no concentration column for a third-body species', () => {
    const keys = listConditionItems({ species }).map((item) => item.key)
    // Concentration columns are keyed by species id in the app.
    expect(keys).toContain('CONC#s-o3')
    expect(keys).not.toContain('CONC#s-m')
  })

  it('skips an uploaded third-body concentration with a clear reason', () => {
    const upload = buildConditionsUpload(
      [parseConditionsCsv({ name: 'a.csv', text: 'time.s,CONC.M.mol m-3,CONC.O3.mol m-3\n0,1,2' })],
      listConditionItems({ species }),
      { thirdBodyNames: new Set(['M']) }
    )
    expect(upload.columns.map((column) => column.key)).toEqual(['CONC#s-o3'])
    expect(upload.skipped).toEqual([
      {
        header: 'CONC.M.mol m-3',
        file: 'a.csv',
        reason: 'third-body species; its concentration cannot be set',
      },
    ])
  })
})
