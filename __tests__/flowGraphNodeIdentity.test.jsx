import React from 'react'
import { describe, it, expect, beforeAll } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'

import mechanismReducer, { addReaction, addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer, { setExcludedResults } from '../src/redux/slices/simulationSlice'
import { FlowGraph } from '../src/components/Plots/FlowGraph'
import { buildTracerConcentrationKeys } from '../src/services/simulation/local/tracer'

// The flow diagram identifies reaction nodes by the reaction's id, not its name.

beforeAll(() => {
  if (!globalThis.SVGElement.prototype.getBBox) {
    globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 40, height: 12 })
  }
})

const SAME_NAME = 'HNO3 + OH -> NO3'

// The generated fallback name for this formula. Passing it means the reaction has no name of
// its own, so the label falls through to the type-based qualifiers.
const GENERATED_NAME = 'HNO3 -> NO3'

const reaction = (id, type, name = GENERATED_NAME) => ({
  id,
  name,
  type,
  reactants: [{ 'species name': 'HNO3', coefficient: 1 }],
  products: [{ 'species name': 'NO3', coefficient: 1 }],
})

const REACTIONS = [reaction('a', 'ARRHENIUS'), reaction('b', 'TROE')]

const renderGraph = (reactions = REACTIONS) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  ;['HNO3', 'NO3'].forEach((name) => store.dispatch(addSpecies({ name })))
  reactions.forEach((entry) => store.dispatch(addReaction(entry)))

  // Tracer concentrations integrate to 5 for the first reaction and 50 for the second.
  // Tracer keys are derived from each reaction's own name and index, as run.js does.
  const [first, second] = reactions.map(
    (entry, index) => buildTracerConcentrationKeys(index, entry.name)[0]
  )
  store.dispatch(
    setExcludedResults([
      { time: 0, concentrations: { [first]: 0, [second]: 0 } },
      { time: 1, concentrations: { [first]: 5, [second]: 50 } },
    ])
  )

  return render(
    <Provider store={store}>
      <FlowGraph
        selectedSpecies={['HNO3', 'NO3']}
        rateRange={{ start: 0, end: 0 }}
        timeRange={{ start: 0, end: 1 }}
      />
    </Provider>
  )
}

describe('flow diagram node identity', () => {
  it('renders a node per reaction even when their names collide', () => {
    const { container } = renderGraph()
    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))
    expect(labels).toHaveLength(2)
  })

  it('gives each colliding reaction its own rate', () => {
    const { container } = renderGraph()
    const rates = new Set(
      [...container.querySelectorAll('text')]
        .map((node) => node.textContent)
        .filter((text) => /mol m/.test(text))
    )

    // Keyed by name, the map overwrites and both nodes report 5.000e+1.
    expect(rates).toContain('5.000e+0 mol m⁻³')
    expect(rates).toContain('5.000e+1 mol m⁻³')
  })

  // Separate nodes with correct rates are not enough on their own: identical text makes them
  // impossible to tell apart on screen.
  it('qualifies a colliding label with the reaction type', () => {
    const { container } = renderGraph()
    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))

    expect(labels).toHaveLength(2)
    expect(new Set(labels).size).toBe(2)
    expect(labels.some((label) => /\(Arrhenius\)/.test(label))).toBe(true)
    expect(labels.some((label) => /\(Troe/.test(label))).toBe(true)
  })

  it('numbers them when the type collides as well', () => {
    const { container } = renderGraph([
      reaction('a', 'ARRHENIUS'),
      reaction('b', 'ARRHENIUS'),
      reaction('c', 'ARRHENIUS'),
    ])
    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))

    expect(new Set(labels).size).toBe(3)
    expect(labels.every((label) => /\(Arrhenius \d\)/.test(label))).toBe(true)
  })

  it('leaves a unique label alone', () => {
    const { container } = renderGraph([reaction('a', 'ARRHENIUS')])
    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))

    expect(labels).toEqual(['HNO3 → NO3'])
  })

  // Labels are built over every reaction, not just the visible ones, so a shape the label builder
  // cannot read takes the whole diagram down. SURFACE reactions carry no `reactants`/`products`
  // at all -- ts1 has 13 of them -- and BRANCHED splits its products in two.
  it('survives reaction shapes that carry no reactants/products', () => {
    const surface = {
      id: 's1',
      type: 'SURFACE',
      name: 'usr_NO2_aer',
      'gas-phase species': 'HNO3',
      'gas-phase products': [{ 'species name': 'NO3', coefficient: 1 }],
    }
    const branched = {
      id: 'b1',
      type: 'BRANCHED_NO_RO2',
      name: 'branched',
      reactants: [{ 'species name': 'HNO3', coefficient: 1 }],
      'alkoxy products': [{ 'species name': 'NO3', coefficient: 1 }],
      'nitrate products': [{ 'species name': 'NO3', coefficient: 1 }],
    }

    const { container } = renderGraph([reaction('a', 'ARRHENIUS'), surface, branched])
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0)
  })

  it('reads a surface reaction formula from its gas-phase fields', () => {
    const { container } = renderGraph([
      {
        id: 's1',
        type: 'SURFACE',
        name: 'usr',
        reactants: [{ 'species name': 'HNO3', coefficient: 1 }],
        products: [{ 'species name': 'NO3', coefficient: 1 }],
      },
      {
        id: 's2',
        type: 'SURFACE',
        name: 'usr2',
        'gas-phase species': 'HNO3',
        'gas-phase products': [{ 'species name': 'NO3', coefficient: 1 }],
      },
    ])

    // Both describe HNO3 -> NO3, so both labels collide and get numbered.
    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))
    expect(labels.some((label) => label.startsWith('HNO3 → NO3'))).toBe(true)
  })

  // An emission has no reactants and a first-order loss no products. A blank side reads as a
  // rendering fault, so the empty set is shown instead -- as the reaction editor does.
  it('labels an empty side with the empty set', () => {
    const { container } = renderGraph([
      {
        id: 'e1',
        type: 'EMISSION',
        name: 'emit',
        products: [{ 'species name': 'HNO3', coefficient: 1 }],
      },
      {
        id: 'l1',
        type: 'FIRST_ORDER_LOSS',
        name: 'loss',
        reactants: [{ 'species name': 'NO3', coefficient: 1 }],
      },
    ])

    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))

    expect(labels).toContain('\u2205 → HNO3')
    expect(labels).toContain('NO3 → \u2205')
  })

  // ts1's heterogeneous reactions repeat a formula across aerosol surfaces and share a type, so
  // neither the formula nor the type tells them apart -- only the name the mechanism declares.
  it('prefers a declared name over the type when labels collide', () => {
    const { container } = renderGraph([
      reaction('h1', 'USER_DEFINED', 'het1'),
      reaction('h2', 'USER_DEFINED', 'het7'),
      reaction('h3', 'USER_DEFINED', 'het12'),
    ])

    const labels = [...container.querySelectorAll('text')]
      .map((node) => node.textContent)
      .filter((text) => text.includes('→'))

    expect(labels.sort()).toEqual([
      'HNO3 → NO3 (het1)',
      'HNO3 → NO3 (het12)',
      'HNO3 → NO3 (het7)',
    ])
  })
})
