import { describe, it, expect } from 'vitest'
import { toReduxConfig } from '../src/services/config/loadMusicBoxConfig'
import { MusicBox } from '@ncar/music-box'
import { configureStore } from '@reduxjs/toolkit'
import mechanismReducer, { addSpecies, setConfig } from '../src/redux/slices/mechanismSlice'

import { buildLocalSimulationPayload } from '../src/services/simulation/local/payload'
import { runLocalSimulation } from '../src/services/simulation/local/run'
import { TRACER_PREFIX } from '../src/services/simulation/local/tracer'
import {
  SPECIES_PROPERTIES,
  PHASE_PROPERTY_KEYS,
} from '../src/services/simulation/local/speciesProperties'
import { durationSeconds, stepSeconds } from './helpers/boxModelOptions'

import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }

// These tests validate the mechanism schema strictly and rejects any unrecognized or missing key.
// The component tests in RunSimulationButton.*.test.jsx cover the React and Redux wiring, which
// is a different concern and much cheaper to exercise.

const EXAMPLES = [
  ['analytical', analyticalConfig],
  ['chapman', chapmanConfig],
  ['flow_tube', flowTubeConfig],
  ['carbon_bond_5', carbonBond5Config],
  ['ts1', ts1Config],
]

const buildInputs = async (config) => {
  const options = config['box model options'] || {}
  return {
    mechanismData: {
      config: { mechanism: (await toReduxConfig(config)).mechanism },
      currentExample: { name: config.mechanism?.name || 'example' },
    },
    conditions: {
      conditions: config.conditions,
      basic: {
        timeStep: stepSeconds(options, 'chemistry time step'),
        outputFrequency: stepSeconds(options, 'output time step'),
        duration: durationSeconds(options),
      },
    },
  }
}

describe('solver payload contract', () => {
  it.each(EXAMPLES)('%s builds a payload the solver accepts', async (_name, config) => {
    const { mechanismData, conditions } = await buildInputs(config)
    const { payload } = buildLocalSimulationPayload({ mechanismData, conditions })

    await expect(MusicBox.fromJson(payload).solve()).resolves.toBeDefined()
  }, 30000)

  // MICM requires 'molecular weight [kg mol-1]' for the gas-phase species of a SURFACE reaction.
  it('keeps molecular weight on species used by SURFACE reactions', async () => {
    const { mechanismData, conditions } = await buildInputs(ts1Config)
    const { payload } = buildLocalSimulationPayload({ mechanismData, conditions })

    const surfaceSpecies = payload.mechanism.reactions
      .filter((reaction) => reaction.type === 'SURFACE')
      .map((reaction) => reaction['gas-phase species'])

    expect(surfaceSpecies.length).toBeGreaterThan(0)

    for (const name of surfaceSpecies) {
      const species = payload.mechanism.species.find((entry) => entry?.name === name)
      expect(species, `${name} missing from payload`).toBeDefined()
      expect(
        species['molecular weight [kg mol-1]'],
        `${name} lost its molecular weight`
      ).toBeGreaterThan(0)
    }
  })

  // SURFACE reactions carry 'gas-phase products' rather than 'products', which is a separate
  // branch of the tracer injection, and they are the reactions that require molecular weight.
  it('injects tracers into SURFACE reactions without breaking the solve', async () => {
    const surfaceOnly = structuredClone(ts1Config)
    surfaceOnly.mechanism.reactions = surfaceOnly.mechanism.reactions.filter(
      (reaction) => reaction.type === 'SURFACE'
    )
    expect(surfaceOnly.mechanism.reactions.length).toBeGreaterThan(0)

    const { mechanismData, conditions } = await buildInputs(surfaceOnly)
    const { results, excludedResults } = await runLocalSimulation({ mechanismData, conditions })

    expect(results.length).toBeGreaterThan(0)
    const excludedKeys = Object.keys(excludedResults[0].concentrations)
    expect(excludedKeys.length).toBe(surfaceOnly.mechanism.reactions.length)
    expect(excludedKeys.every((key) => key.includes(TRACER_PREFIX))).toBe(true)
  }, 30000)

  it('solves with tracer instrumentation and keeps tracers out of the results', async () => {
    const { mechanismData, conditions } = await buildInputs(carbonBond5Config)
    const { results, excludedResults } = await runLocalSimulation({ mechanismData, conditions })

    expect(results.length).toBeGreaterThan(0)
    expect(excludedResults.length).toBe(results.length)

    const visibleKeys = Object.keys(results[0].concentrations)
    expect(visibleKeys.length).toBeGreaterThan(0)
    expect(visibleKeys.some((key) => key.includes(TRACER_PREFIX))).toBe(false)

    const excludedKeys = Object.keys(excludedResults[0].concentrations)
    expect(excludedKeys.length).toBeGreaterThan(0)
    expect(excludedKeys.every((key) => key.includes(TRACER_PREFIX))).toBe(true)
  }, 30000)

  // mechanism.species[] rejects unknown keys, so PhaseSpecies properties (diffusion coefficient,
  // density) must be routed to the phase entries instead.
  it('routes species properties to mechanism.species[] and keeps phase properties out', async () => {
    const names = analyticalConfig.mechanism.species.map((sp) => sp.name)
    const store = configureStore({ reducer: { mechanism: mechanismReducer } })
    store.dispatch(
      setConfig({ mechanism: { ...analyticalConfig.mechanism, species: [], phases: [], reactions: [] } })
    )
    // Add each species the way the editor does: its species fields, phase, and phase-only
    // properties together in one object.
    SPECIES_PROPERTIES.forEach((field, index) =>
      store.dispatch(
        addSpecies({
          name: names[index] ?? `SP${index}`,
          phase: 'gas',
          [field.key]: field.type === 'boolean' ? true : 1e-6,
        })
      )
    )

    const { conditions } = await buildInputs(analyticalConfig)
    const { payload } = buildLocalSimulationPayload({
      mechanismData: { ...store.getState().mechanism, currentExample: { name: 'analytical' } },
      conditions,
    })

    for (const field of SPECIES_PROPERTIES) {
      const entry = payload.mechanism.species.find((sp) => sp[field.key] !== undefined)
      if (field.target === 'species') {
        expect(entry, `${field.key} should reach mechanism.species[]`).toBeDefined()
      } else {
        expect(entry, `${field.key} must not reach mechanism.species[]`).toBeUndefined()
      }
    }

    for (const key of PHASE_PROPERTY_KEYS) {
      expect(payload.mechanism.species.some((sp) => key in sp)).toBe(false)
    }

    // Route them to the phase entry. Since phases[].species[] is not validated, this assertion
    // catches typos that would otherwise be silently ignored.
    const phaseEntries = payload.mechanism.phases.flatMap((phase) => phase.species)
    for (const field of SPECIES_PROPERTIES.filter((f) => f.target === 'phase')) {
      const carrier = phaseEntries.find((entry) => entry[field.key] !== undefined)
      expect(carrier, `${field.key} should reach phases[].species[]`).toBeDefined()
      expect(carrier[field.key]).toBe(1e-6)
    }

    // A phase-species "density [kg m-3]" with no phase-transfer reaction consuming it no longer
    // builds under MICM v3.13.0's aerosol validation (it did under v3.12.0). Routing is already
    // checked above; strip it here so this test still confirms every other property solves.
    const solvable = structuredClone(payload)
    solvable.mechanism.phases.forEach((phase) => {
      phase.species.forEach((sp) => delete sp['density [kg m-3]'])
    })
    await expect(MusicBox.fromJson(solvable).solve()).resolves.toBeDefined()
  }, 30000)
})
