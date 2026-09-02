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

describe('unset rate parameters', () => {
  it('the exact flow reported: add photolysis with a blank scaling factor, then edit it', async () => {
    const store = configureStore({
      reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
    })
    ;['O2', 'O'].forEach((n) => store.dispatch(addSpecies({ name: n })))
    render(<MemoryRouter><Provider store={store}><ReactionEditor /><Toaster /></Provider></MemoryRouter>)
  
    // choose Photolysis in the add form
    fireEvent.click(document.querySelectorAll('[aria-haspopup="listbox"]')[0])
    fireEvent.click([...document.querySelectorAll('[role="option"]')].find((o) => /photolysis/i.test(o.textContent)))
  
    const inputs = [...document.querySelectorAll('input[type="text"]')].filter((i) => !/search/i.test(i.placeholder || ''))
    fireEvent.change(inputs[0], { target: { value: 'O2' } })
    fireEvent.change(inputs[1], { target: { value: '2O' } })
    // leave scaling factor blank
    fireEvent.click(screen.getByRole('button', { name: /add reaction/i }))
  
    await waitFor(() => expect(store.getState().mechanism.reactions).toHaveLength(1))
    expect(store.getState().mechanism.reactions[0]).not.toHaveProperty('scaling factor')
  
    // expand the chip: the field is offered, blank
    fireEvent.click(screen.getAllByRole('button').find((b) => /→/.test(b.textContent)))
    const panel = screen.getByRole('button', { name: 'Remove' }).parentElement.parentElement
    const row = [...panel.querySelectorAll('div')].find(
      (d) => [...d.children].some((c) => c.tagName === 'SPAN' && c.textContent === 'scaling factor')
    )
    expect(row).toBeDefined()
    const field = row.querySelector('input')
    expect(field.value).toBe('')
  
    // and filling it in saves
    fireEvent.change(field, { target: { value: '0.5' } })
    fireEvent.blur(field)
    expect(store.getState().mechanism.reactions[0]['scaling factor']).toBe(0.5)
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
      reactants: [{ 'species name': 'A' }],
      products: [{ 'species name': 'B' }],
      A: 1.2e-11,
    }))

    render(
      <MemoryRouter>
        <Provider store={store}>
          <ReactionEditor />
        </Provider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getAllByRole('button').find((b) => /\u2192/.test(b.textContent)))

    const panel = screen.getByRole('button', { name: 'Remove' }).parentElement.parentElement
    const rows = [...panel.querySelectorAll('div')].filter(
      (d) =>
        [...d.children].some((c) => c.tagName === 'SPAN') &&
        [...d.children].some((c) => c.tagName === 'INPUT')
    )

    const byName = Object.fromEntries(
      rows.map((row) => [
        row.querySelector('span').textContent,
        { value: row.querySelector('input').value, placeholder: row.querySelector('input').placeholder },
      ])
    )

    // A is set, so it shows a value; the rest are blank and advertise the default that applies.
    expect(byName.A).toEqual({ value: '1.20e-11', placeholder: '1.0' })
    expect(byName.B).toEqual({ value: '', placeholder: '0.0' })
    expect(byName.D).toEqual({ value: '', placeholder: '300.0' })
  })
})
