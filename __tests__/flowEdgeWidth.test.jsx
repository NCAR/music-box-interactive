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

// A reaction with no flux in the selected window integrates to a rate of zero. Under logarithmic
// arrow scaling that fed log(0) = -Infinity into the stroke width, which SVG rejects: the browser
// fell back to a 1px stroke, and since markers scale with stroke-width the arrowhead vanished.
// The visible symptom was a hairline with no arrow.

beforeAll(() => {
  if (!globalThis.SVGElement.prototype.getBBox) {
    globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 40, height: 12 })
  }
})

const REACTIONS = [
  {
    id: 'p0',
    name: 'dark',
    type: 'PHOTOLYSIS',
    reactants: [{ 'species name': 'NO2', coefficient: 1 }],
    products: [{ 'species name': 'NO', coefficient: 1 }],
  },
  {
    id: 'p1',
    name: 'lit',
    type: 'PHOTOLYSIS',
    reactants: [{ 'species name': 'NO2', coefficient: 1 }],
    products: [{ 'species name': 'O3', coefficient: 1 }],
  },
]

const renderGraph = (isLogScale) => {
  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  ;['NO2', 'NO', 'O3'].forEach((name) => store.dispatch(addSpecies({ name })))
  REACTIONS.forEach((reaction) => store.dispatch(addReaction(reaction)))

  // "dark" never proceeds, so its tracer never moves off zero.
  const dark = buildTracerConcentrationKeys(0, 'dark')[0]
  const lit = buildTracerConcentrationKeys(1, 'lit')[0]
  store.dispatch(
    setExcludedResults([
      { time: 0, concentrations: { [dark]: 0, [lit]: 0 } },
      { time: 1, concentrations: { [dark]: 0, [lit]: 1e-6 } },
    ])
  )

  return render(
    <Provider store={store}>
      <FlowGraph
        selectedSpecies={['NO2', 'NO', 'O3']}
        rateRange={{ start: 0, end: 1e-6, isLogScale, maxArrowWidth: 10 }}
        timeRange={{ start: 0, end: 1 }}
      />
    </Provider>
  )
}

const strokeWidths = (container) =>
  [...container.querySelectorAll('line,path')].map((el) => el.style.strokeWidth).filter(Boolean)

describe('edge stroke width', () => {
  it('keeps a zero-rate edge finite under logarithmic scaling', () => {
    const widths = strokeWidths(renderGraph(true).container)

    expect(widths.length).toBeGreaterThan(0)
    widths.forEach((width) => expect(Number.isFinite(Number.parseFloat(width))).toBe(true))
    // The zero-rate edge draws at the base width, not at 1px browser fallback.
    expect(widths).toContain('2')
  })

  it('still scales a non-zero edge above the base width', () => {
    const widths = strokeWidths(renderGraph(true).container).map(Number.parseFloat)
    expect(Math.max(...widths)).toBeGreaterThan(2)
  })

  it('gives every edge an arrow marker', () => {
    const { container } = renderGraph(true)
    const markers = [...container.querySelectorAll('line,path')]
      .map((el) => el.getAttribute('marker-end'))
      .filter(Boolean)

    expect(markers.length).toBeGreaterThan(0)
    markers.forEach((marker) => expect(marker).toMatch(/^url\(#arrow/))
  })

  it('is unaffected under linear scaling, which never hit the log', () => {
    const widths = strokeWidths(renderGraph(false).container)
    widths.forEach((width) => expect(Number.isFinite(Number.parseFloat(width))).toBe(true))
  })
})
