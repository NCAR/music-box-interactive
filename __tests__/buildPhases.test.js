import { describe, it, expect } from 'vitest'
import { buildPhases } from '../src/services/simulation/local/mechanism'

const names = (phases) => Object.fromEntries(phases.map((p) => [p.name, p.species.map((s) => s.name)]))

const twoPhases = {
  phases: [
    { name: 'gas', species: [{ name: 'A' }] },
    { name: 'aqueous', species: [{ name: 'B', 'density [kg m-3]': 1000 }] },
  ],
}

describe('buildPhases', () => {
  it('keeps each species only in the phases that list it', () => {
    const species = [
      { name: 'A', phase: 'gas' },
      { name: 'B', phase: 'aqueous' },
    ]
    expect(names(buildPhases(twoPhases, species))).toEqual({ gas: ['A'], aqueous: ['B'] })
  })

  it('keeps a species that the config lists in more than one phase in all of them', () => {
    const mechanism = {
      phases: [
        { name: 'gas', species: [{ name: 'A' }] },
        { name: 'aqueous', species: [{ name: 'A' }] },
      ],
    }
    expect(names(buildPhases(mechanism, [{ name: 'A', phase: 'gas' }]))).toEqual({
      gas: ['A'],
      aqueous: ['A'],
    })
  })

  it('puts a new species only into its editor phase', () => {
    const species = [
      { name: 'A', phase: 'gas' },
      { name: 'B', phase: 'aqueous' },
      { name: 'C', phase: 'gas' },
    ]
    expect(names(buildPhases(twoPhases, species))).toEqual({ gas: ['A', 'C'], aqueous: ['B'] })
  })

  it('moves a species when the user changes its phase', () => {
    const species = [
      { name: 'A', phase: 'aqueous' },
      { name: 'B', phase: 'aqueous' },
    ]
    expect(names(buildPhases(twoPhases, species))).toEqual({ gas: [], aqueous: ['A', 'B'] })
  })

  it('adds a phase that only the editor names', () => {
    const species = [
      { name: 'A', phase: 'gas' },
      { name: 'B', phase: 'aqueous' },
      { name: 'D', phase: 'organic' },
    ]
    expect(names(buildPhases(twoPhases, species))).toEqual({
      gas: ['A'],
      aqueous: ['B'],
      organic: ['D'],
    })
  })

  it('builds one gas phase when the mechanism declares no phases', () => {
    expect(names(buildPhases({}, [{ name: 'A' }, { name: 'B' }]))).toEqual({ gas: ['A', 'B'] })
  })

  it('keeps phase-species properties, and the editor value wins', () => {
    const species = [
      { name: 'A', phase: 'gas' },
      { name: 'B', phase: 'aqueous', 'diffusion coefficient [m2 s-1]': 2e-5 },
    ]
    const aqueous = buildPhases(twoPhases, species).find((p) => p.name === 'aqueous')
    expect(aqueous.species).toEqual([
      { name: 'B', 'density [kg m-3]': 1000, 'diffusion coefficient [m2 s-1]': 2e-5 },
    ])
  })
})
