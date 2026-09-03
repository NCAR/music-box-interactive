import { describe, it, expect } from 'vitest'

import { getReactionEdges } from '../src/components/Plots/flowUtils'
import { buildGeneratedReactionName } from '../src/components/Mechanism/reactions/reactionUtils'

import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }

// Reaction names are not unique: distinct reactions can share reactants and products,
// causing generated names to collide. The flow diagram therefore identifies reaction
// nodes by their own id; name-based keys would merge them and report only one rate.

const NO_THIRD_BODIES = new Set()

const loadedNames = (config) =>
  config.mechanism.reactions.map((reaction) =>
    typeof reaction.name === 'string' && reaction.name.trim()
      ? reaction.name
      : buildGeneratedReactionName(reaction)
  )

const duplicatesIn = (names) => {
  const counts = new Map()
  names.forEach((name) => counts.set(name, (counts.get(name) ?? 0) + 1))
  return [...counts.entries()].filter(([, count]) => count > 1)
}

describe('reaction names are not unique', () => {
  it('ts1 and carbon_bond_5 both contain colliding names', () => {
    // If a mechanism update removes these, the id-keyed nodes stay correct regardless
    expect(duplicatesIn(loadedNames(ts1Config)).length).toBeGreaterThan(0)
    expect(duplicatesIn(loadedNames(carbonBond5Config)).length).toBeGreaterThan(0)
  })

  it('the colliding ts1 reactions really are different reactions', () => {
    const byName = new Map()
    ts1Config.mechanism.reactions.forEach((reaction) => {
      const name =
        typeof reaction.name === 'string' && reaction.name.trim()
          ? reaction.name
          : buildGeneratedReactionName(reaction)
      byName.set(name, [...(byName.get(name) ?? []), reaction])
    })

    const collided = [...byName.values()].filter((group) => group.length > 1)
    expect(collided.length).toBeGreaterThan(0)

    // Same formula, different rate constants. They cannot be collapsed into one node.
    for (const group of collided) {
      const fingerprints = new Set(group.map((r) => JSON.stringify([r.type, r.A, r.C, r.k0_A])))
      expect(fingerprints.size).toBeGreaterThan(1)
    }
  })
})

describe('getReactionEdges node identity', () => {
  const reaction = {
    name: 'HNO3 + OH -> NO3 + H2O',
    reactants: [{ 'species name': 'HNO3', coefficient: 1 }],
    products: [{ 'species name': 'NO3', coefficient: 1 }],
  }

  it('attaches edges to the id it is given, not the reaction name', () => {
    const edges = getReactionEdges(reaction, 10, NO_THIRD_BODIES, 'rxn-a')
    expect(edges).toEqual([
      { source: 'HNO3', target: 'rxn-a', value: 10 },
      { source: 'rxn-a', target: 'NO3', value: 10 },
    ])
  })

  it('keeps same-named reactions on separate nodes', () => {
    const first = getReactionEdges(reaction, 10, NO_THIRD_BODIES, 'rxn-a')
    const second = getReactionEdges(reaction, 99, NO_THIRD_BODIES, 'rxn-b')

    const targets = new Set([...first, ...second].flatMap((e) => [e.source, e.target]))
    expect(targets.has('rxn-a')).toBe(true)
    expect(targets.has('rxn-b')).toBe(true)
    // The rates stay attributed to their own reaction rather than one overwriting the other.
    expect(first.every((e) => e.value === 10)).toBe(true)
    expect(second.every((e) => e.value === 99)).toBe(true)
  })

  it('falls back to the name when no id is supplied', () => {
    const edges = getReactionEdges(reaction, 10, NO_THIRD_BODIES)
    expect(edges[0].target).toBe(reaction.name)
  })
})
