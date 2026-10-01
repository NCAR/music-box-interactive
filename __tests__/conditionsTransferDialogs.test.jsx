import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'

import conditionsReducer from '../src/redux/slices/conditionsSlice'
import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import { ConditionsButtons } from '../src/components/ConditionsTransfer/ConditionsButtons'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const renderButtons = () => {
  const store = configureStore({
    reducer: { conditions: conditionsReducer, mechanism: mechanismReducer },
  })
  store.dispatch(
    setConfig({
      mechanism: {
        species: [{ name: 'O3' }, { name: 'NO2' }],
        reactions: [{ type: 'PHOTOLYSIS', name: 'O3_1' }],
      },
    })
  )
  const utils = render(
    <Provider store={store}>
      <ConditionsButtons />
    </Provider>
  )
  return { store, ...utils }
}

const csvFile = (text, name = 'conditions.csv') => {
  const file = new File([text], name, { type: 'text/csv' })
  file.arrayBuffer = async () => new TextEncoder().encode(text).buffer
  return file
}

const chooseFile = (container, file) =>
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } })

describe('Upload Conditions dialog', () => {
  beforeEach(() => toast.mockClear())

  it('previews the file with all columns selected and applies only the selected ones', async () => {
    const { store, container } = renderButtons()
    chooseFile(
      container,
      csvFile('time.s,CONC.O3.mol m-3,CONC.NO2.mol m-3,CONC.XYZ.mol m-3\n0,1e-6,2e-7,1\n60,,3e-7,1')
    )

    await screen.findByRole('dialog', { name: 'Upload Conditions' })
    const checkboxes = screen.getAllByRole('checkbox', { name: /CONC\./ })
    expect(checkboxes).toHaveLength(2)
    checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked())
    expect(screen.getByText('CONC.XYZ.mol m-3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: /O3/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(store.getState().conditions.table).toEqual({
      times: [0, 60],
      columns: { 'CONC.NO2.mol m-3': [2e-7, 3e-7] },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Columns Skipped' }))
  })

  it('shows an error toast for a file without a time column', async () => {
    const { container } = renderButtons()
    chooseFile(container, csvFile('CONC.O3.mol m-3\n1'))
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Upload Failed' }))
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('enables the empty-cell option only for merge mode', async () => {
    const { container } = renderButtons()
    chooseFile(container, csvFile('time.s,CONC.O3.mol m-3\n0,1'))
    await screen.findByRole('dialog', { name: 'Upload Conditions' })

    const option = screen.getByRole('checkbox', { name: /Empty cells overwrite/ })
    expect(option).toBeDisabled()
    expect(option).not.toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: /Merge by column/ }))
    expect(option).toBeEnabled()
  })
})

describe('Download Conditions dialog', () => {
  it('lists every condition item, all selected, and Deselect all disables the download', () => {
    renderButtons()
    fireEvent.click(screen.getByRole('button', { name: 'Download conditions' }))

    const dialog = screen.getByRole('dialog', { name: 'Download Conditions' })
    const checkboxes = dialog.querySelectorAll('input[type="checkbox"]')
    // Temperature, pressure, air density, two species, one photolysis rate.
    expect(checkboxes).toHaveLength(6)
    checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked())
    expect(screen.getAllByText('No data')).toHaveLength(6)

    fireEvent.click(screen.getByRole('button', { name: 'Deselect all' }))
    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
  })
})
