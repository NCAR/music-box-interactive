import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import mechanismReducer, { addReaction } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { ReactionEditor } from '../src/components/Mechanism/ReactionEditor'

// Parameter names range from "A" to "reaction probability". The name column is sized to the
// longest name the reaction actually has, so short names do not reserve room for long ones and
// long ones do not wrap. Widths are in `ch`, exact because the names render monospaced.

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const expand = (reaction) => {
  const store = configureStore({
    reducer: { mechanism: mechanismReducer, conditions: conditionsReducer, simulation: simulationReducer },
  })
  store.dispatch(addReaction(reaction))
  render(<MemoryRouter><Provider store={store}><ReactionEditor /></Provider></MemoryRouter>)
  fireEvent.click(screen.getAllByRole('button').find((b) => /→/.test(b.textContent)))
}
const base = { reactants: [{ 'species name': 'A' }], products: [{ 'species name': 'B' }] }
const nameSpans = () => {
  const panel = screen.getByRole('button', { name: 'Remove' }).parentElement.parentElement
  return [...panel.querySelectorAll('div')]
    .filter(
      (d) =>
        [...d.children].some((c) => c.tagName === 'SPAN') &&
        [...d.children].some((c) => c.tagName === 'INPUT')
    )
    .map((d) => d.querySelector('span'))
}

describe('parameter name column', () => {
  it('short names get a narrow column', () => {
  expand({ id: 'r1', type: 'ARRHENIUS', ...base, A: 1, B: 2, C: 3 })
  const spans = nameSpans()
  expect(spans.map((s) => s.textContent)).toEqual(['A', 'B', 'C', 'D', 'E'])
  spans.forEach((s) => expect(s.style.width).toBe('1ch'))
  })

  it('a long name widens the column for the whole reaction', () => {
  expand({ id: 'r2', type: 'SURFACE', 'gas-phase species': 'NO2',
    'gas-phase products': [{ 'species name': 'OH' }], 'reaction probability': 8e-6 })
  const spans = nameSpans()
  expect(spans.map((s) => s.textContent)).toEqual(['reaction probability'])
  expect(spans[0].style.width).toBe('20ch')   // "reaction probability".length
  expect(spans[0].className).toContain('whitespace-nowrap')
  })

  it('mixed lengths all share the longest name width', () => {
  expand({ id: 'r3', type: 'TROE', ...base, Fc: 0.6, k0_A: 1e-30, kinf_A: 2.5e-11 })
  const widths = new Set(nameSpans().map((s) => s.style.width))
  expect(widths).toEqual(new Set(['6ch']))   // longest is "kinf_A"
  })
})
