import { describe, it, expect } from 'vitest'
import { MusicBox } from '@ncar/music-box'

import { buildDownloadableConfig } from '../src/services/config/downloadConfig'
import { buildLocalSimulationPayload } from '../src/services/simulation/local/payload'
import { durationSeconds, stepSeconds } from './helpers/boxModelOptions'

import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }

// Mirrors solverPayloadContract.test.js's buildInputs -- same shape Run Simulation feeds
// buildLocalSimulationPayload, and what Download Config now feeds MusicBox's own export.
const EXAMPLES = [
  ['analytical', analyticalConfig],
  ['chapman', chapmanConfig],
  ['flow_tube', flowTubeConfig],
  ['carbon_bond_5', carbonBond5Config],
  ['ts1', ts1Config],
]

const buildInputs = (config) => {
  const options = config['box model options'] || {}
  return {
    mechanism: {
      mechanism: { mechanism: config.mechanism },
      species: [],
      reactions: [],
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

describe('downloadConfig', () => {
  it('builds a well-formed config from a blank (no mechanism loaded) state', () => {
    const blankMechanism = {
      selectedMechanism: null,
      currentExample: null,
      species: [],
      reactions: [],
      phases: [],
      mechanism: {},
    }
    const blankConditions = {
      basic: { duration: 250000, timeStep: 200, outputFrequency: 10 },
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      evolving: { enabled: false, times: [], temperature: [], pressure: [], additionalSeries: {} },
      conditions: {},
      rateConstants: {},
    }

    const configuration = buildDownloadableConfig({ mechanism: blankMechanism, conditions: blankConditions })

    expect(configuration.mechanism.name).toBe('custom')
    expect(configuration.mechanism.species).toEqual([])
    expect(configuration.mechanism.reactions).toEqual([])
    expect(configuration.conditions.data.length).toBeGreaterThan(0)
    expect(configuration.metadata.version).toBe('1.0.0')
  })

  it.each(EXAMPLES)(
    '%s: downloaded config solves to the same results as Run Simulation',
    async (_name, config) => {
      const { mechanism, conditions } = buildInputs(config)

      const configuration = buildDownloadableConfig({ mechanism, conditions })

      const { payload } = buildLocalSimulationPayload({ mechanismData: mechanism, conditions })
      const [runResult, downloadedResult] = await Promise.all([
        MusicBox.fromJson(payload).solve(),
        MusicBox.fromJson(configuration).solve(),
      ])

      expect(downloadedResult.height).toBe(runResult.height)
      expect([...downloadedResult.columns].sort()).toEqual([...runResult.columns].sort())
      for (const column of runResult.columns) {
        for (let i = 0; i < runResult.height; i++) {
          expect(downloadedResult.data[column][i]).toBeCloseTo(runResult.data[column][i], 8)
        }
      }
    },
    30000
  )

  // The tests above always pass species/reactions as [], which takes the "no user edits" branch
  // (buildLocalSimulationPayload falls back to the raw uploaded mechanism). Once a user edits a
  // species or reaction in the UI, mechanismData.species/reactions is populated and
  // reconcileSpeciesWithSource/reconcileReactionNamesWithSource kick in instead -- this covers
  // that path.
  it('reflects species and reaction edits made in the UI, not just the uploaded mechanism', () => {
    const { mechanism: baseMechanism, conditions } = buildInputs(chapmanConfig)
    const sourceSpecies = chapmanConfig.mechanism.species
    const sourceReactions = chapmanConfig.mechanism.reactions

    // Mirrors what loadMusicBoxConfig + the species editor put into mechanismData.species: name,
    // phase, and only explicitly declared property keys.
    const editedSpecies = sourceSpecies.map((species) => ({
      name: species.name,
      phase: 'Gas',
      ...(species.name === 'O3' ? { 'absolute tolerance': 1e-15 } : {}),
      ...(species.name === 'M' ? { 'molecular weight [kg mol-1]': 0.048 } : {}),
    }))

    const editedReactions = sourceReactions.map((reaction, index) =>
      index === 0 ? { ...reaction, A: reaction.A * 2 } : reaction
    )

    const mechanism = { ...baseMechanism, species: editedSpecies, reactions: editedReactions }
    const configuration = buildDownloadableConfig({ mechanism, conditions })

    const o3 = configuration.mechanism.species.find((s) => s.name === 'O3')
    const m = configuration.mechanism.species.find((s) => s.name === 'M')
    expect(o3['absolute tolerance']).toBe(1e-15)
    expect(m['molecular weight [kg mol-1]']).toBe(0.048)
    // An untouched species keeps only what the source mechanism declared.
    expect(
      configuration.mechanism.species.find((s) => s.name === 'O1D')['absolute tolerance']
    ).toBeUndefined()

    expect(configuration.mechanism.reactions[0].A).toBe(sourceReactions[0].A * 2)
  })

  it('a config with edited species and reactions still solves', async () => {
    const { mechanism: baseMechanism, conditions } = buildInputs(chapmanConfig)
    const editedSpecies = chapmanConfig.mechanism.species.map((species) => ({
      name: species.name,
      phase: 'Gas',
      ...(species.name === 'O3' ? { 'absolute tolerance': 1e-15 } : {}),
    }))
    const mechanism = { ...baseMechanism, species: editedSpecies, reactions: [] }

    const configuration = buildDownloadableConfig({ mechanism, conditions })
    const result = await MusicBox.fromJson(configuration).solve()

    expect(result.height).toBeGreaterThan(0)
  })
})
