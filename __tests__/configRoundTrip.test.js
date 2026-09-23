import { describe, it, expect, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { File } from 'node:buffer'
import { MusicBox } from '@ncar/music-box'

import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'
import { buildDownloadableConfig } from '../src/services/config/downloadConfig'
import { parseUploadedMusicBoxConfig } from '../src/services/config/parseUploadedMusicBoxConfig'
import { loadMusicBoxConfig, toReduxConfig } from '../src/services/config/loadMusicBoxConfig'
import { durationSeconds, stepSeconds } from './helpers/boxModelOptions'

import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }

// A config this app downloads must be re-uploadable and reproduce the same simulation -- the
// boundary where past bugs (a wrong "__absolute tolerance" key, double "__" prefixing of
// other_properties) actually surfaced for a user. Nothing else in the suite exercises the full
// download -> upload -> Redux -> re-download chain together.

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
      config: { mechanism: toReduxConfig(config).mechanism },
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

const uploadAndLoad = async (downloadedConfig) => {
  const file = new File([JSON.stringify(downloadedConfig)], 'config.json', {
    type: 'application/json',
  })
  const parsed = await parseUploadedMusicBoxConfig(file)

  const store = configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })
  loadMusicBoxConfig(parsed, {
    dispatch: store.dispatch,
    navigate: vi.fn(),
    meta: { id: 'uploaded', name: 'Uploaded' },
  })
  return store
}

describe('download -> upload round trip', () => {
  it.each(EXAMPLES)(
    '%s: re-uploading a downloaded config solves to the same results',
    async (_name, config) => {
      const { mechanism, conditions } = buildInputs(config)
      const downloaded = buildDownloadableConfig({ mechanism, conditions })

      const store = await uploadAndLoad(downloaded)
      const reloaded = buildDownloadableConfig({
        mechanism: store.getState().mechanism,
        conditions: store.getState().conditions,
      })

      const [originalResult, reloadedResult] = await Promise.all([
        MusicBox.fromJson(downloaded).solve(),
        MusicBox.fromJson(reloaded).solve(),
      ])

      expect(reloadedResult.height).toBe(originalResult.height)
      expect([...reloadedResult.columns].sort()).toEqual([...originalResult.columns].sort())
      for (const column of originalResult.columns) {
        for (let i = 0; i < originalResult.height; i++) {
          expect(reloadedResult.data[column][i]).toBeCloseTo(originalResult.data[column][i], 8)
        }
      }
    },
    30000
  )

  it('preserves declared species properties through a full round trip', async () => {
    const { mechanism, conditions } = buildInputs(chapmanConfig)
    const downloaded = buildDownloadableConfig({ mechanism, conditions })

    const store = await uploadAndLoad(downloaded)
    const reloadedSpecies = store.getState().mechanism.config.mechanism.species

    const m = reloadedSpecies.find((s) => s.name === 'M')
    expect(m['is third body']).toBe(true)
  })

  it('preserves box model options and conditions through a full round trip', async () => {
    const { mechanism, conditions } = buildInputs(chapmanConfig)
    const downloaded = buildDownloadableConfig({ mechanism, conditions })

    const store = await uploadAndLoad(downloaded)
    const state = store.getState()

    expect(state.conditions.basic.timeStep).toBe(conditions.basic.timeStep)
    expect(state.conditions.basic.outputFrequency).toBe(conditions.basic.outputFrequency)
    expect(state.conditions.basic.duration).toBe(conditions.basic.duration)
    expect(state.conditions.conditions.data.length).toBe(downloaded.conditions.data.length)
  })

  it('round trips a config downloaded with edited species/reactions', async () => {
    const { mechanism, conditions } = buildInputs(chapmanConfig)
    const o3 = mechanism.config.mechanism.species.find((s) => s.name === 'O3')
    o3['absolute tolerance'] = 1e-15
    const downloaded = buildDownloadableConfig({ mechanism, conditions })

    const store = await uploadAndLoad(downloaded)
    const reloadedO3 = store.getState().mechanism.config.mechanism.species.find(
      (s) => s.name === 'O3'
    )

    expect(reloadedO3['absolute tolerance']).toBe(1e-15)
  })
})
