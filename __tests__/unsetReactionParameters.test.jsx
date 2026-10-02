import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addReaction, addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'
import { Toaster } from '../src/components/ui/toaster'

// Leaving a rate parameter blank means "use the solver's default" -- the key is simply not
// written. The parameter must still be listed on the chip, or an omitted one would be impossible
// to set afterwards.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

// The type filter is the second dropdown; the first chooses the type in the Add card.
const showType = (label) => {
  fireEvent.click(document.querySelectorAll('[aria-haspopup="listbox"]')[1])
  fireEvent.click(screen.getByRole('option', { name: label }))
}

// Clicks a parameter cell, which turns it into an input, and returns that input.
const editCell = (key) => {
  fireEvent.click(
    screen.getAllByRole('button').find((b) => b.getAttribute('aria-label')?.startsWith(`Edit ${key} of `))
  )
  return screen.getByRole('textbox', { name: new RegExp(`^${key} of `) })
}

describe('unset rate parameters', () => {
  it('the exact flow reported: add photolysis with a blank scaling factor, then edit it', async () => {
    const store = configureStore({
      reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
    })
    ;['O2', 'O'].forEach((n) => store.dispatch(addSpecies({ name: n })))
    render(<MemoryRouter><Provider store={store}><ReactionEditor /><Toaster /></Provider></MemoryRouter>)
  
    // choose Photolysis in the Add card (its type dropdown is the first one) and fill it in
    fireEvent.click(document.querySelectorAll('[aria-haspopup="listbox"]')[0])
    fireEvent.click(screen.getByRole('option', { name: 'Photolysis' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'New reaction Reactants' }), {
      target: { value: 'O2' },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'New reaction Products' }), {
      target: { value: '2O' },
    })
    // leave scaling factor blank
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(store.getState().mechanism.config.mechanism.reactions).toHaveLength(1))
    expect(store.getState().mechanism.config.mechanism.reactions[0]).not.toHaveProperty('scaling factor')
  
    // show the Photolysis columns: the field is offered, blank
    showType(/^Photolysis \(/)
    const field = editCell('scaling factor')
    expect(field.value).toBe('')
  
    // and filling it in saves
    fireEvent.change(field, { target: { value: '0.5' } })
    fireEvent.blur(field)
    expect(store.getState().mechanism.config.mechanism.reactions[0]['scaling factor']).toBe(0.5)
  })

  it('an unset parameter shows the solver default as its placeholder', () => {
    const store = configureStore({
      reducer: {
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
        simulation: simulationReducer,
      },
    })
    store.dispatch(addReaction({
      id: 'r1',
      type: 'ARRHENIUS',
      'gas phase': 'gas',
      reactants: [{ name: 'A' }],
      products: [{ name: 'B' }],
      A: 1.2e-11,
    }))

    render(
      <MemoryRouter>
        <Provider store={store}>
          <ReactionEditor />
        </Provider>
      </MemoryRouter>
    )
    showType(/^Arrhenius \(/)
    const field = (key) => {
      const input = editCell(key)
      const shown = { value: input.value, placeholder: input.placeholder }
      fireEvent.blur(input)
      return shown
    }
    const byName = { A: field('A'), B: field('B'), D: field('D') }

    // A is set, so it shows a value; the rest are blank and advertise the default that applies.
    expect(byName.A).toEqual({ value: '1.20e-11', placeholder: '1.0' })
    expect(byName.B).toEqual({ value: '', placeholder: '0.0' })
    expect(byName.D).toEqual({ value: '', placeholder: '300.0' })
  })
})
