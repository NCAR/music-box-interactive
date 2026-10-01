import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseCsv } from '../src/utils/csv'
import {
  buildConditionsTable,
  headerKey,
  listConditionItems,
  withHydratedConditions,
} from '../src/services/conditions/conditionsTable'
import { buildConditionsFiles } from '../src/services/conditions/exportConditions'
import {
  ConditionsUploadError,
  applyConditionsUpload,
  buildConditionsUpload,
  parseConditionsCsv,
  readConditionsFiles,
} from '../src/services/conditions/importConditions'

const species = [{ name: 'O3' }, { name: 'NO2' }]
const reactions = [
  { type: 'PHOTOLYSIS', name: 'O3_1' },
  { type: 'EMISSION', name: 'NO2_emis' },
  { type: 'SURFACE', name: 'aer' },
  { type: 'ARRHENIUS', name: 'not_a_rate_parameter' },
]

const baseConditions = () => ({
  initial: { temperature: 290, pressure: 100000, concentrations: { O3: 1e-6 } },
  rateConstants: { 'PHOTO.O3_1.s-1': 1e-4 },
  evolving: {
    enabled: true,
    times: [0, 3600],
    temperature: [null, 280],
    pressure: [null, null],
    additionalSeries: {
      'CONC.NO2.mol m-3': [2e-7, null],
      'PHOTO.O3_1.s-1': [null, 5e-5],
    },
    rowReactionType: { 3600: ['PHOTOLYSIS'] },
  },
  hydration: { initialExampleId: null, evolvingExampleId: null },
  conditions: {},
})

const items = (conditions = baseConditions()) => listConditionItems({ species, reactions, conditions })

const upload = (text, conditions) =>
  buildConditionsUpload([parseConditionsCsv({ name: 'up.csv', text })], items(conditions))

const allKeys = (conditions) => new Set(items(conditions).map((item) => item.key))

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, CRLF and blank lines', () => {
    expect(parseCsv('a,"b,c","d""e"\r\n\r\n1,,3\n')).toEqual([
      ['a', 'b,c', 'd"e'],
      ['1', '', '3'],
    ])
  })
})

describe('headerKey', () => {
  it('drops the unit segment', () => {
    expect(headerKey('CONC.O3.mol m-3')).toBe('CONC.O3')
    expect(headerKey('CONC.O3')).toBe('CONC.O3')
    expect(headerKey('ENV.temperature.K')).toBe('ENV.temperature')
    expect(headerKey('SURF.aer.effective radius.m')).toBe('SURF.aer.effective radius')
    expect(headerKey('PHOTO.O3_1')).toBe('PHOTO.O3_1')
  })
})

describe('listConditionItems', () => {
  it('lists environment, species and rate-parameter items from the mechanism', () => {
    expect(items().map((item) => item.header)).toEqual([
      'ENV.temperature.K',
      'ENV.pressure.Pa',
      'ENV.air number density.mol m-3',
      'CONC.O3.mol m-3',
      'CONC.NO2.mol m-3',
      'PHOTO.O3_1.s-1',
      'EMIS.NO2_emis.mol m-3 s-1',
      'SURF.aer.effective radius.m',
      'SURF.aer.particle number concentration.# m-3',
    ])
  })
})

describe('buildConditionsTable', () => {
  it('lets an evolving t=0 value override the initial value and leaves unset cells out', () => {
    const table = buildConditionsTable(baseConditions())
    expect(table.times).toEqual([0, 3600])
    expect(Object.fromEntries(table.rows.get(0))).toEqual({
      'ENV.temperature': 290,
      'ENV.pressure': 100000,
      'CONC.O3': 1e-6,
      'CONC.NO2': 2e-7,
      'PHOTO.O3_1': 1e-4,
    })
    expect(Object.fromEntries(table.rows.get(3600))).toEqual({
      'ENV.temperature': 280,
      'PHOTO.O3_1': 5e-5,
    })
  })

  it('ignores the evolving series when they are disabled', () => {
    const conditions = baseConditions()
    conditions.evolving.enabled = false
    expect(buildConditionsTable(conditions).times).toEqual([0])
  })
})

describe('withHydratedConditions', () => {
  it('hydrates a loaded example that MechanismPage has not hydrated yet', () => {
    const conditions = {
      ...baseConditions(),
      initial: { temperature: 298.15, pressure: 101325, concentrations: {} },
      rateConstants: {},
      evolving: { enabled: false, times: [], temperature: [], pressure: [], additionalSeries: {} },
      conditions: {
        data: [{ headers: ['time.s', 'ENV.temperature.K', 'CONC.O3.mol m-3'], rows: [[0, 250, 3e-6]] }],
      },
    }
    const table = buildConditionsTable(withHydratedConditions(conditions, 'example'))
    expect(table.rows.get(0).get('ENV.temperature')).toBe(250)
    expect(table.rows.get(0).get('CONC.O3')).toBe(3e-6)
  })
})

describe('buildConditionsFiles', () => {
  it('writes empty cells for unset values, never zero', () => {
    const [file] = buildConditionsFiles({ conditions: baseConditions(), items: items() })
    expect(file.name).toBe('conditions.csv')
    expect(file.text.split('\n')).toEqual([
      'time.s,ENV.temperature.K,ENV.pressure.Pa,ENV.air number density.mol m-3,CONC.O3.mol m-3,' +
        'CONC.NO2.mol m-3,PHOTO.O3_1.s-1,EMIS.NO2_emis.mol m-3 s-1,SURF.aer.effective radius.m,' +
        'SURF.aer.particle number concentration.# m-3',
      '0,290,100000,,0.000001,2e-7,0.0001,,,',
      '3600,280,,,,,0.00005,,,',
    ])
  })

  it('writes one file for each category with a selected item, and applies the time range', () => {
    const selected = items().filter((item) => ['ENV.pressure', 'PHOTO.O3_1'].includes(item.key))
    const files = buildConditionsFiles({
      conditions: baseConditions(),
      items: selected,
      layout: 'perCategory',
      timeRange: { start: 1, end: null },
    })
    expect(files).toEqual([
      { name: 'environment.csv', text: 'time.s,ENV.pressure.Pa' },
      { name: 'rate_parameters.csv', text: 'time.s,PHOTO.O3_1.s-1\n3600,0.00005' },
    ])
  })
})

describe('parseConditionsCsv', () => {
  it('reads empty cells as null', () => {
    expect(parseConditionsCsv({ name: 'a.csv', text: 'time.s,CONC.O3\n0,\n10,1e-6' })).toEqual({
      name: 'a.csv',
      headers: ['time.s', 'CONC.O3'],
      rows: [
        [0, null],
        [10, 1e-6],
      ],
    })
  })

  it.each([
    ['CONC.O3\n1', 'first column'],
    ['time.s,CONC.O3\n0,abc', '"abc"'],
    ['time.s,CONC.O3\n-1,1', 'negative time'],
    ['time.s,CONC.O3,CONC.O3\n0,1,1', 'more than once'],
  ])('rejects %j', (text, message) => {
    expect(() => parseConditionsCsv({ name: 'a.csv', text })).toThrow(ConditionsUploadError)
    expect(() => parseConditionsCsv({ name: 'a.csv', text })).toThrow(message)
  })
})

describe('buildConditionsUpload', () => {
  it('skips columns that are not in the mechanism or that have an unsupported unit', () => {
    const result = upload('time.s,CONC.O3.ppb,CONC.XYZ.mol m-3,foo,PHOTO.O3_1.s-1\n0,1,2,3,4')
    expect(result.columns.map((column) => column.header)).toEqual(['PHOTO.O3_1.s-1'])
    expect(result.skipped).toEqual([
      { header: 'CONC.O3.ppb', file: 'up.csv', reason: 'unit "ppb" is not supported' },
      { header: 'CONC.XYZ.mol m-3', file: 'up.csv', reason: 'not in the mechanism' },
      { header: 'foo', file: 'up.csv', reason: 'not a condition column' },
    ])
  })

  it('reads a zip of CSV files', async () => {
    const zipped = zipSync({
      'environment.csv': strToU8('time.s,ENV.temperature.K\n0,300'),
      '__MACOSX/._environment.csv': strToU8('junk'),
      'notes.txt': strToU8('ignored'),
    })
    const file = { name: 'conditions.zip', arrayBuffer: async () => zipped.buffer }
    const files = await readConditionsFiles(file)
    expect(files.map((f) => f.name)).toEqual(['environment.csv'])
  })
})

describe('applyConditionsUpload', () => {
  const apply = (text, options, conditions = baseConditions()) =>
    applyConditionsUpload(conditions, upload(text, conditions), {
      keys: allKeys(conditions),
      ...options,
    })

  it('replace mode clears everything that is not in the file', () => {
    const result = apply('time.s,CONC.O3.mol m-3\n0,5e-6\n60,6e-6', { mode: 'replace' })
    expect(result.initial).toMatchObject({ temperature: 298.15, pressure: 101325, concentrations: {} })
    expect(result.rateConstants).toEqual({})
    expect(result.evolving).toMatchObject({
      enabled: true,
      times: [0, 60],
      temperature: [null, null],
      pressure: [null, null],
      additionalSeries: { 'CONC.O3.mol m-3': [5e-6, 6e-6] },
      rowReactionType: {},
    })
  })

  it('merge mode keeps other columns and keeps existing values under empty cells', () => {
    const result = apply('time.s,ENV.temperature.K,CONC.NO2.mol m-3\n0,,9e-7\n3600,270,', {
      mode: 'merge',
    })
    expect(result.initial.temperature).toBe(290)
    expect(result.evolving.times).toEqual([0, 3600])
    expect(result.evolving.temperature).toEqual([290, 270])
    expect(result.evolving.pressure).toEqual([100000, null])
    expect(result.evolving.additionalSeries).toEqual({
      'CONC.O3.mol m-3': [1e-6, null],
      'CONC.NO2.mol m-3': [9e-7, null],
      'PHOTO.O3_1.s-1': [1e-4, 5e-5],
    })
    expect(result.evolving.rowReactionType).toEqual({ 3600: ['PHOTOLYSIS'] })
  })

  it('merge mode clears existing values under empty cells when emptyOverwrites is on', () => {
    const result = apply('time.s,PHOTO.O3_1.s-1\n3600,', { mode: 'merge', emptyOverwrites: true })
    expect(result.evolving.additionalSeries['PHOTO.O3_1.s-1']).toEqual([1e-4, null])
  })

  it('ignores the deselected columns', () => {
    const conditions = baseConditions()
    const result = applyConditionsUpload(
      conditions,
      upload('time.s,CONC.O3.mol m-3,CONC.NO2.mol m-3\n0,1,2', conditions),
      { keys: new Set(['CONC.NO2']), mode: 'replace' }
    )
    expect(result.evolving.additionalSeries).toEqual({ 'CONC.NO2.mol m-3': [2] })
  })

  it('round-trips a download through an upload', () => {
    const conditions = baseConditions()
    const [file] = buildConditionsFiles({ conditions, items: items(conditions) })
    const result = applyConditionsUpload(conditions, upload(file.text, conditions), {
      keys: allKeys(conditions),
      mode: 'replace',
    })
    const before = buildConditionsTable(conditions)
    const after = buildConditionsTable({ ...result, hydration: conditions.hydration })
    expect(after.times).toEqual(before.times)
    before.times.forEach((time) =>
      expect(Object.fromEntries(after.rows.get(time))).toEqual(Object.fromEntries(before.rows.get(time)))
    )
  })
})
