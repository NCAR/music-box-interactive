import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen } from '@testing-library/react'

import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import mechanismReducer, { setConfig } from '../src/redux/slices/mechanismSlice'
import { ReactionTab } from '../src/components/Conditions/ReactionTab'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const reactions = [
  { type: 'PHOTOLYSIS', name: 'jno2' },
  { type: 'EMISSION', name: 'emis_no' },
  { type: 'FIRST_ORDER_LOSS', name: 'loss_o3' },
  { type: 'USER_DEFINED', name: 'usr_1' },
  { type: 'SURFACE', name: 'aer' },
]

const renderTab = () => {
  const store = configureStore({ reducer: { conditions: conditionsReducer, mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism: { species: [], reactions } }))
  store.dispatch(setConditionsTable({ times: [0], columns: {} }))
  render(
    <Provider store={store}>
      <ReactionTab />
    </Provider>
  )
  return store
}

const header = (name) =>
  screen.getAllByRole('columnheader').find((th) => th.textContent.startsWith(name))?.textContent

const chooseType = (label) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))

describe('units on the Reaction tab', () => {
  it.each([
    ['Photolysis', 'jno2', 'jno2(s-1)'],
    ['Emissions', 'emis_no', 'emis_no(mol m-3 s-1)'],
    ['Loss', 'loss_o3', 'loss_o3(s-1)'],
    ['User defined', 'usr_1', 'usr_1(s-1)'],
  ])('shows the unit of %s values', (type, name, expected) => {
    renderTab()
    chooseType(type)
    expect(header(name)).toBe(expected)
  })

  it('offers both surface properties with their units', () => {
    renderTab()
    chooseType('Surface')
    expect(header('aer')).toBe('aer(m)')
    fireEvent.click(screen.getByRole('button', { name: 'particle number concentration (particles m-3)' }))
    expect(header('aer')).toBe('aer(particles m-3)')
  })

  it('stores a new value under a header with the music-box unit', () => {
    const store = renderTab()
    chooseType('Surface')
    fireEvent.click(screen.getByRole('button', { name: 'particle number concentration (particles m-3)' }))
    const cell = screen.getAllByRole('textbox').at(-1)
    fireEvent.change(cell, { target: { value: '5' } })
    fireEvent.blur(cell)
    expect(store.getState().conditions.table.columns).toEqual({
      'SURF.aer.particle number concentration.# m-3': [5],
    })
  })
})
