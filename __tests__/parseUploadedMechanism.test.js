import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { configureStore } from '@reduxjs/toolkit'
import { zipSync, strToU8 } from 'fflate'
// jsdom's own File/Blob do not implement .text()/.arrayBuffer() (unlike every real
// browser), so tests use Node's implementation instead of the jsdom global.
import { File } from 'node:buffer'

import { parseUploadedMusicBoxConfig } from '../src/services/config/parseUploadedMusicBoxConfig'
import { loadMusicBoxConfig } from '../src/services/config/loadMusicBoxConfig'
import mechanismReducer from '../src/redux/slices/mechanismSlice'
import conditionsReducer from '../src/redux/slices/conditionsSlice'
import simulationReducer from '../src/redux/slices/simulationSlice'

// Covers the upload of a mechanism configuration without a music-box configuration. The
// fixtures are the examples of https://github.com/NCAR/MechanismConfiguration/tree/main/examples,
// without v1.4. The app does not support the v1.4 reaction types yet.

// Vitest runs from the repository root. In jsdom, import.meta.url is not a file URL.
const FIXTURES = `${resolve('__tests__/fixtures/mechanism_configuration')}/`

const readFixture = (path) => readFileSync(`${FIXTURES}${path}`, 'utf8')

// All of the files in a fixture directory, keyed by the path in the zip.
const zipFixtureDir = (dir, prefix = '') =>
  zipSync(
    Object.fromEntries(
      readdirSync(`${FIXTURES}${dir}`).map((name) => [
        `${prefix}${name}`,
        strToU8(readFixture(`${dir}/${name}`)),
      ])
    )
  )

const makeFile = (name, content) => new File([content], name)

const SINGLE_FILE_EXAMPLES = [
  ['v1/1.0/config.json', 7, 13],
  ['v1/1.0/config.yaml', 7, 13],
  ['v1/1.2/config.json', 10, 13],
  ['v1/1.2/config.yaml', 10, 13],
  ['v1/1.3/config.json', 10, 13],
  ['v1/1.3/config.yaml', 10, 13],
  ['v1/cam_cloud_chemistry.json', 10, 0],
  ['v1/cam_cloud_chemistry.yaml', 10, 0],
  ['v1/full_configuration.json', 7, 13],
  ['v1/full_configuration.yaml', 7, 13],
]

// Each split example holds one entry point. The v0 directory holds a JSON and a YAML copy of
// each file, so each copy goes in its own zip.
const SPLIT_EXAMPLES = [
  ['v0 json', 'v0', ['config.json', 'species.json', 'reactions.json'], 9, 12],
  ['v0 yaml', 'v0', ['config.yaml', 'species.yaml', 'reactions.yaml'], 9, 12],
  ['v1.1 json', 'v1/1.1/json', null, 7, 13],
  ['v1.1 yaml', 'v1/1.1/yaml', null, 7, 13],
  ['v1 split json', 'v1/config/json', null, 3, 6],
  ['v1 split yaml', 'v1/config/yaml', null, 3, 6],
]

const zipSplitExample = (dir, names, prefix = '') =>
  names
    ? zipSync(
        Object.fromEntries(
          names.map((name) => [`${prefix}${name}`, strToU8(readFixture(`${dir}/${name}`))])
        )
      )
    : zipFixtureDir(dir, prefix)

describe('parseUploadedMusicBoxConfig: mechanism configuration files', () => {
  it.each(SINGLE_FILE_EXAMPLES)('parses %s', async (path, speciesCount, reactionCount) => {
    const name = path.split('/').pop()
    const result = await parseUploadedMusicBoxConfig(makeFile(name, readFixture(path)))

    expect(result.conditions).toBeUndefined()
    expect(result.mechanism.species).toHaveLength(speciesCount)
    expect(result.mechanism.reactions).toHaveLength(reactionCount)
  })

  it('tells the user to upload a .zip when a file includes files that are not there', async () => {
    const file = makeFile('config.json', readFixture('v1/1.1/json/config.json'))

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/\.zip/)
  })

  it('reports the MUSICA parser message for a mechanism that is not valid', async () => {
    const mechanism = { version: '1.0.0', name: 'x', species: [], phases: [], reactions: [] }
    mechanism.reactions.push({ type: 'NOT_A_REACTION' })
    const file = makeFile('bad.json', JSON.stringify(mechanism))

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/NOT_A_REACTION/)
  })
})

describe('parseUploadedMusicBoxConfig: mechanism configurations split across files', () => {
  it.each(SPLIT_EXAMPLES)('parses a zip of %s', async (_label, dir, names, species, reactions) => {
    const file = makeFile('mechanism.zip', zipSplitExample(dir, names))
    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.mechanism.species).toHaveLength(species)
    expect(result.mechanism.reactions).toHaveLength(reactions)
  })

  it.each(SPLIT_EXAMPLES)(
    'parses a zip of %s inside a folder',
    async (_label, dir, names, species, reactions) => {
      const file = makeFile('mechanism.zip', zipSplitExample(dir, names, 'my_mechanism/'))
      const result = await parseUploadedMusicBoxConfig(file)

      expect(result.mechanism.species).toHaveLength(species)
      expect(result.mechanism.reactions).toHaveLength(reactions)
    }
  )

  it('gives a v0 mechanism a version that the v1 parser accepts', async () => {
    const [, dir, names] = SPLIT_EXAMPLES[0]
    const file = makeFile('mechanism.zip', zipSplitExample(dir, names))
    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.mechanism.version).toBe('1.0.0')
  })

  it('errors when the zip holds more than one entry point', async () => {
    const file = makeFile('mechanism.zip', zipFixtureDir('v1/1.0'))

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/more than one/i)
  })

  it('errors when the zip holds only the included files', async () => {
    const zipped = zipSync({ 'species.json': strToU8(readFixture('v1/1.1/json/species.json')) })
    const file = makeFile('mechanism.zip', zipped)

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/does not contain/i)
  })
})

describe('loadMusicBoxConfig: a mechanism configuration', () => {
  const makeStore = () =>
    configureStore({
      reducer: {
        mechanism: mechanismReducer,
        conditions: conditionsReducer,
        simulation: simulationReducer,
      },
    })

  it.each(SINGLE_FILE_EXAMPLES)('loads %s', async (path, speciesCount, reactionCount) => {
    const name = path.split('/').pop()
    const config = await parseUploadedMusicBoxConfig(makeFile(name, readFixture(path)))
    const store = makeStore()

    await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn() })

    const { mechanism } = store.getState().mechanism.config
    expect(mechanism.species).toHaveLength(speciesCount)
    expect(mechanism.reactions).toHaveLength(reactionCount)
  })

  it.each(SPLIT_EXAMPLES)('loads a zip of %s', async (_label, dir, names, species, reactions) => {
    const config = await parseUploadedMusicBoxConfig(
      makeFile('mechanism.zip', zipSplitExample(dir, names))
    )
    const store = makeStore()

    await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn() })

    const { mechanism } = store.getState().mechanism.config
    expect(mechanism.species).toHaveLength(species)
    expect(mechanism.reactions).toHaveLength(reactions)
  })

  it('loads the mechanism and keeps the default conditions', async () => {
    const [, dir, names] = SPLIT_EXAMPLES[0]
    const config = await parseUploadedMusicBoxConfig(
      makeFile('mechanism.zip', zipSplitExample(dir, names))
    )
    const store = makeStore()
    const defaultConditions = store.getState().conditions

    await loadMusicBoxConfig(config, { dispatch: store.dispatch, navigate: vi.fn() })

    const { mechanism } = store.getState().mechanism.config
    expect(mechanism.species).toHaveLength(9)
    expect(mechanism.reactions).toHaveLength(12)
    expect(store.getState().conditions.basic).toEqual(defaultConditions.basic)
    expect(store.getState().conditions.table).toEqual(defaultConditions.table)
  })
})
