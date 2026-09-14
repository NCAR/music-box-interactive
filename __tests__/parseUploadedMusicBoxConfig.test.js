import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
// jsdom's own File/Blob do not implement .text()/.arrayBuffer() (unlike every real
// browser), so tests use Node's implementation instead of the jsdom global.
import { File } from 'node:buffer'

import { parseUploadedMusicBoxConfig } from '../src/services/config/parseUploadedMusicBoxConfig'

// Upload Config must accept the real music-box v1 wire format (@ncar/music-box and the
// Python acom_music_box tool both read it), including configs that split conditions out
// into CSV files referenced by "conditions.filepaths" -- which only a .zip can carry.

const wireConfig = (overrides = {}) => ({
  'box model options': {
    grid: 'box',
    'chemistry time step [sec]': 1,
    'output time step [sec]': 1,
    'simulation length [hr]': 1,
  },
  conditions: {},
  mechanism: {
    name: 'Test',
    species: [{ name: 'A' }, { name: 'B' }],
    reactions: [],
    phases: [{ name: 'gas', species: [{ name: 'A' }, { name: 'B' }] }],
    version: '1.0.0',
  },
  ...overrides,
})

const makeFile = (name, content, type = 'application/octet-stream') =>
  new File([content], name, { type })

describe('parseUploadedMusicBoxConfig: plain JSON', () => {
  it('loads a self-contained config with no CSV references', async () => {
    const config = wireConfig()
    const file = makeFile('config.json', JSON.stringify(config), 'application/json')

    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.mechanism.name).toBe('Test')
    expect(result.conditions).toEqual({})
  })

  it('rejects a config that still references external CSV files', async () => {
    const config = wireConfig({ conditions: { filepaths: ['initial_concentrations.csv'] } })
    const file = makeFile('config.json', JSON.stringify(config), 'application/json')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/initial_concentrations\.csv/)
  })

  it('rejects a file that is not valid JSON', async () => {
    const file = makeFile('config.json', '{not json', 'application/json')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/valid JSON/)
  })

  it('rejects a config missing mechanism or conditions', async () => {
    const file = makeFile('config.json', JSON.stringify({ mechanism: {} }), 'application/json')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/missing/i)
  })

  it('rejects an unsupported file type', async () => {
    const file = makeFile('config.txt', 'hello', 'text/plain')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/\.json.*\.zip/)
  })
})

describe('parseUploadedMusicBoxConfig: zip bundles', () => {
  it('resolves bundled CSV files and inlines them into conditions.data', async () => {
    const config = wireConfig({
      conditions: { filepaths: ['initial_concentrations.csv', 'conditions_Boulder.csv'] },
    })
    const initialConcentrations = 'time.s,CONC.A.mol m-3\n0,1e-6\n'
    const boulder =
      'time.s,ENV.temperature.K,ENV.pressure.Pa\n0,298.15,101325\n3600,300,101000\n'
    const zipped = zipSync({
      'my_config.json': strToU8(JSON.stringify(config)),
      'initial_concentrations.csv': strToU8(initialConcentrations),
      'conditions_Boulder.csv': strToU8(boulder),
    })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.conditions.filepaths).toBeUndefined()
    expect(result.conditions.data).toHaveLength(2)
    expect(result.conditions.data[0].headers).toContain('CONC.A.mol m-3')
    expect(result.conditions.data[1].headers).toContain('ENV.temperature.K')
  })

  it('resolves CSVs nested in the same subfolder as the config', async () => {
    const config = wireConfig({ conditions: { filepaths: ['initial_concentrations.csv'] } })
    const csv = 'time.s,CONC.A.mol m-3\n0,1e-6\n'
    const zipped = zipSync({
      'my_bundle/my_config.json': strToU8(JSON.stringify(config)),
      'my_bundle/initial_concentrations.csv': strToU8(csv),
    })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.conditions.data).toHaveLength(1)
    expect(result.conditions.data[0].headers).toContain('CONC.A.mol m-3')
  })

  it('merges CSV-derived blocks ahead of any inline conditions.data', async () => {
    const config = wireConfig({
      conditions: {
        filepaths: ['initial_concentrations.csv'],
        data: [{ headers: ['time.s'], rows: [[0]] }],
      },
    })
    const csv = 'time.s,CONC.A.mol m-3\n0,1e-6\n'
    const zipped = zipSync({
      'my_config.json': strToU8(JSON.stringify(config)),
      'initial_concentrations.csv': strToU8(csv),
    })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.conditions.data).toHaveLength(2)
    expect(result.conditions.data[0].headers).toContain('CONC.A.mol m-3')
  })

  it('errors when a referenced CSV file is missing from the zip', async () => {
    const config = wireConfig({ conditions: { filepaths: ['missing.csv'] } })
    const zipped = zipSync({ 'my_config.json': strToU8(JSON.stringify(config)) })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/missing\.csv/)
  })

  it('errors when the zip has no JSON configuration file', async () => {
    const zipped = zipSync({ 'data.csv': strToU8('a,b\n1,2\n') })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/does not contain/i)
  })

  it('errors when the zip has more than one JSON file', async () => {
    const config = wireConfig()
    const zipped = zipSync({
      'a.json': strToU8(JSON.stringify(config)),
      'b.json': strToU8(JSON.stringify(config)),
    })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    await expect(parseUploadedMusicBoxConfig(file)).rejects.toThrow(/more than one/i)
  })

  it('ignores macOS zip artifacts like __MACOSX and .DS_Store', async () => {
    const config = wireConfig({ conditions: { filepaths: ['initial_concentrations.csv'] } })
    const csv = 'time.s,CONC.A.mol m-3\n0,1e-6\n'
    const zipped = zipSync({
      'my_config.json': strToU8(JSON.stringify(config)),
      'initial_concentrations.csv': strToU8(csv),
      '__MACOSX/._my_config.json': strToU8('junk'),
      '.DS_Store': strToU8('junk'),
    })
    const file = makeFile('bundle.zip', zipped, 'application/zip')

    const result = await parseUploadedMusicBoxConfig(file)

    expect(result.conditions.data).toHaveLength(1)
  })
})
