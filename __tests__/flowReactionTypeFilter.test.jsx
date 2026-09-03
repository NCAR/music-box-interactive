import React from 'react'
import { describe, it, expect, beforeAll } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { render, fireEvent } from '@testing-library/react'

import mechanismReducer, { addReaction, addSpecies } from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer, { setExcludedResults } from '../src/redux/slices/simulationSlice'
import { FlowGraph } from '../src/components/Plots/FlowGraph'
import { FlowPanel } from '../src/components/Plots/FlowPanel'
import { matchesReactionType } from '../src/components/Plots/flowUtils'
import { buildTracerConcentrationKeys } from '../src/services/simulation/local/tracer'

// The flow diagram filters by reaction type alongside the species selection. The two combine:
// the species filter decides what may be shown, the type filter narrows it further.

beforeAll(() => {
  if (!globalThis.SVGElement.prototype.getBBox) {
    globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 40, height: 12 })
  }
})

const REACTIONS = [
  {
    id: 'a',
    name: 'arr',
    type: 'ARRHENIUS',
    reactants: [{ 'species name': 'NO2', coefficient: 1 }],
    products: [{ 'species name': 'NO', coefficient: 1 }],
  },
  {
    id: 'p',
    name: 'pho',
    type: 'PHOTOLYSIS',
    reactants: [{ 'species name': 'NO2', coefficient: 1 }],
    products: [{ 'species name': 'O3', coefficient: 1 }],
  },
]

const makeStore = () => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  ;['NO2', 'NO', 'O3'].forEach((name) => store.dispatch(addSpecies({ name })))
  REACTIONS.forEach((reaction) => store.dispatch(addReaction(reaction)))

  const concentrations = {}
  REACTIONS.forEach((reaction, index) => {
    concentrations[buildTracerConcentrationKeys(index, reaction.name)[0]] = 10
  })
  store.dispatch(
    setExcludedResults([
      { time: 0, concentrations: Object.fromEntries(Object.keys(concentrations).map((k) => [k, 0])) },
      { time: 1, concentrations },
    ])
  )
  return store
}

const drawnReactions = (container) =>
  [...container.querySelectorAll('text')]
    .map((node) => node.textContent)
    .filter((text) => text.includes('→'))

const renderGraph = (type) =>
  render(
    <Provider store={makeStore()}>
      <FlowGraph
        selectedSpecies={['NO2', 'NO', 'O3']}
        rateRange={{ start: 0, end: 0 }}
        timeRange={{ start: 0, end: 1 }}
        reactionType={type}
      />
    </Provider>
  )

describe('matchesReactionType', () => {
  it('lets everything through when no type is chosen', () => {
    expect(matchesReactionType({ type: 'ARRHENIUS' }, '')).toBe(true)
  })

  it('canonicalises, so both spellings of a type match', () => {
    expect(matchesReactionType({ type: 'SURFACE' }, 'SURFACE_REACTION')).toBe(true)
    expect(matchesReactionType({ type: 'SURFACE_REACTION' }, 'SURFACE_REACTION')).toBe(true)
    expect(matchesReactionType({ type: 'ARRHENIUS' }, 'SURFACE_REACTION')).toBe(false)
  })
})

describe('flow diagram reaction type filter', () => {
  it('draws every reaction when no type is chosen', () => {
    expect(drawnReactions(renderGraph('').container)).toHaveLength(2)
  })

  it('narrows the diagram to the chosen type', () => {
    const labels = drawnReactions(renderGraph('PHOTOLYSIS').container)
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatch(/O3/)
  })

  it('offers the types present, with counts, in the panel', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <FlowPanel
          arrowScaling="logarithmic"
          setArrowScaling={() => {}}
          range={{ start: 0, end: 1 }}
          setRange={() => {}}
          rateRange={{ start: 0, end: 0 }}
          setRateRange={() => {}}
          selectedSpecies={['NO2']}
          setSelectedSpecies={() => {}}
          valueDisplay="absolute"
          setValueDisplay={() => {}}
          reactionType=""
          setReactionType={() => {}}
        />
      </Provider>
    )

    fireEvent.click(container.querySelector('[aria-haspopup="listbox"]'))
    const options = [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent)
    expect(options).toEqual(['All reactions (2)', 'Arrhenius (1)', 'Photolysis (1)'])
  })
})
