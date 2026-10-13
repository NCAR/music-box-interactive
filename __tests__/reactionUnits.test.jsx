import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent, screen, act } from '@testing-library/react'

import conditionsReducer, { setConditionsTable } from '../src/redux/slices/conditionsSlice'
import mechanismReducer, { setConfig, updateReaction } from '../src/redux/slices/mechanismSlice'
import { ReactionTab } from '../src/components/Conditions/ReactionTab'

const toast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

const reactions = [
  { id: 'r1', type: 'PHOTOLYSIS', name: 'jno2' },
  { id: 'r2', type: 'EMISSION', name: 'emis_no' },
  { id: 'r3', type: 'FIRST_ORDER_LOSS', name: 'loss_o3' },
  { id: 'r4', type: 'USER_DEFINED', name: 'usr_1' },
  { id: 'r5', type: 'SURFACE', name: 'aer' },
]

const renderTab = (mechanismReactions = reactions) => {
  const store = configureStore({ reducer: { conditions: conditionsReducer, mechanism: mechanismReducer } })
  store.dispatch(setConfig({ mechanism: { species: [], reactions: mechanismReactions } }))
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

  it('shows both surface properties at the same time, each with its unit', () => {
    renderTab()
    chooseType('Surface')
    // The reaction name spans its two property sub-columns.
    const [group, ...subColumns] = screen.getAllByRole('columnheader').slice(2)
    expect(group).toHaveTextContent('aer')
    expect(group).toHaveAttribute('colspan', '2')
    expect(subColumns.map((th) => th.textContent)).toEqual([
      'effective radius(m)',
      'particle number concentration(particles m-3)',
    ])
    // The property picker is gone from the sidebar.
    expect(screen.queryByRole('button', { name: /^effective radius/ })).not.toBeInTheDocument()
  })

  it('stores a new value under the reaction id', () => {
    const store = renderTab()
    chooseType('Surface')
    // The last cell of the row is the particle number concentration.
    const cell = screen.getAllByRole('textbox').at(-1)
    fireEvent.change(cell, { target: { value: '5' } })
    fireEvent.blur(cell)
    expect(store.getState().conditions.table.columns).toEqual({
      'SURF#r5#particle number concentration': [5],
    })
  })
})

describe('reactions without a configured name on the Reaction tab', () => {
  const unnamed = {
    id: 'u1',
    type: 'PHOTOLYSIS',
    name: '',
    reactants: [{ name: 'O3', coefficient: 0.5 }],
    products: [{ name: 'O2' }],
  }

  it('lists an unnamed reaction under its generated name, and stores its value by id', () => {
    const store = renderTab([unnamed])
    expect(screen.getByRole('button', { name: '0p5 O3 -> O2' })).toBeInTheDocument()
    expect(header('0p5 O3 -> O2')).toBe('0p5 O3 -> O2(s-1)')

    const cell = screen.getAllByRole('textbox').at(-1)
    fireEvent.change(cell, { target: { value: '2e-5' } })
    fireEvent.blur(cell)
    expect(store.getState().conditions.table.columns).toEqual({ 'PHOTO#u1': [2e-5] })
    expect(store.getState().mechanism.config.mechanism.reactions[0].name).toBe('')
  })

  it('keeps the values when the reaction gets a name', () => {
    const store = renderTab([unnamed])
    const cell = screen.getAllByRole('textbox').at(-1)
    fireEvent.change(cell, { target: { value: '2e-5' } })
    fireEvent.blur(cell)

    act(() => {
      store.dispatch(updateReaction({ ...unnamed, name: 'jo3' }))
    })
    expect(header('jo3')).toBe('jo3(s-1)')
    expect(screen.getAllByRole('textbox').at(-1)).toHaveValue('2.00e-5')
  })
})
