import { describe, it, expect } from 'vitest'
import { fixedDomainTicks, niceTicks, preserveEndLabels } from '../src/components/Plots/chartTicks'

// The plots replaced Recharts with d3, so their ticks copy the Recharts rules.
describe('fixedDomainTicks', () => {
  it('steps from the low end and ends at the high end', () => {
    expect(fixedDomainTicks([0, 3780])).toEqual([0, 950, 1900, 2850, 3780])
    expect(fixedDomainTicks([0, 63])).toEqual([0, 20, 40, 60, 63])
    expect(fixedDomainTicks([0, 1.05])).toEqual([0, 0.3, 0.6, 0.9, 1.05])
  })

  it('gives one tick for an empty domain', () => {
    expect(fixedDomainTicks([5, 5])).toEqual([5])
  })
})

describe('niceTicks', () => {
  it('rounds an automatic domain out to nice ticks from zero', () => {
    expect(niceTicks([0, 6.5e-6])).toEqual([0, 2e-6, 4e-6, 6e-6, 8e-6])
    expect(niceTicks([0, 298.15])).toEqual([0, 75, 150, 225, 300])
    expect(niceTicks([0, 99000])).toEqual([0, 25000, 50000, 75000, 100000])
  })
})

describe('preserveEndLabels', () => {
  const ticks = (coordinates, width) => coordinates.map((coordinate) => ({ coordinate, width }))

  it('keeps the labels that fit, from the last one back', () => {
    // 30 overlaps 40, 10 overlaps 20, and 0 starts before the start.
    expect(preserveEndLabels(ticks([0, 10, 20, 30, 40], 12), 0, 100)).toEqual([
      null,
      null,
      20,
      null,
      40,
    ])
  })

  it('moves the last label left so that it stays inside the end', () => {
    expect(preserveEndLabels(ticks([0, 100], 20), 0, 100)).toEqual([null, 90])
  })
})
