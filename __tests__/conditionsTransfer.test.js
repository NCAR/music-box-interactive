import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { parseCsv } from '../src/utils/csv'
import { countDataPoints, listConditionItems } from '../src/services/conditions/conditionItems'
import { buildConditionsFiles } from '../src/services/conditions/exportConditions'
import {
  ConditionsUploadError,
  applyConditionsUpload,
  buildConditionsUpload,
  parseConditionsCsv,
  readConditionsFiles,
} from '../src/services/conditions/importConditions'
import { headerKey } from '../src/services/conditions/table'

const species = [{ name: 'O3' }, { name: 'NO2' }]
const reactions = [
  { id: 'r-photo', type: 'PHOTOLYSIS', name: 'O3_1' },
  { id: 'r-emis', type: 'EMISSION', name: 'NO2_emis' },
  { id: 'r-surf', type: 'SURFACE', name: 'aer' },
  { id: 'r-arr', type: 'ARRHENIUS', name: 'not_a_rate_parameter' },
]

const baseTable = () => ({
  times: [0, 3600],
  columns: {
    'ENV.temperature.K': [290, 280],
    'ENV.pressure.Pa': [100000, null],
    'CONC.O3': [1e-6, null],
    'CONC.NO2.mol m-3': [2e-7, null],
    // Rate parameters are stored under the reaction id.
    'PHOTO#r-photo': [1e-4, 5e-5],
  },
})

const items = (table = baseTable()) => listConditionItems({ species, reactions, table })
const allKeys = (table = baseTable()) => new Set(items(table).map((item) => item.key))

const upload = (text, table = baseTable()) =>
  buildConditionsUpload([parseConditionsCsv({ name: 'up.csv', text })], items(table))

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

describe('countDataPoints', () => {
  it('counts the set cells of each column by key', () => {
    expect(Object.fromEntries(countDataPoints(baseTable()))).toEqual({
      'ENV.temperature': 2,
      'ENV.pressure': 1,
      'CONC.O3': 1,
      'CONC.NO2': 1,
      'PHOTO#r-photo': 2,
    })
  })
})

describe('buildConditionsFiles', () => {
  it('writes empty cells for unset values, never zero', () => {
    const [file] = buildConditionsFiles({ table: baseTable(), items: items() })
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
    const selected = items().filter((item) => ['ENV.pressure', 'PHOTO#r-photo'].includes(item.key))
    const files = buildConditionsFiles({
      table: baseTable(),
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
  const apply = (text, options, table = baseTable()) =>
    applyConditionsUpload(table, upload(text, table), { keys: allKeys(table), ...options })

  it('replace mode keeps only the selected columns of the file', () => {
    expect(apply('time.s,CONC.O3.mol m-3\n0,5e-6\n60,6e-6', { mode: 'replace' })).toEqual({
      times: [0, 60],
      columns: { 'CONC.O3.mol m-3': [5e-6, 6e-6] },
    })
  })

  it('merge mode keeps other columns and keeps existing values under empty cells', () => {
    const result = apply('time.s,ENV.temperature.K,CONC.NO2.mol m-3\n0,,9e-7\n60,270,', {
      mode: 'merge',
    })
    expect(result).toEqual({
      times: [0, 60, 3600],
      columns: {
        'ENV.temperature.K': [290, 270, 280],
        'ENV.pressure.Pa': [100000, null, null],
        'CONC.O3': [1e-6, null, null],
        'CONC.NO2.mol m-3': [9e-7, null, null],
        'PHOTO#r-photo': [1e-4, null, 5e-5],
      },
    })
  })

  it('merge mode clears existing values under empty cells when emptyOverwrites is on', () => {
    const result = apply('time.s,PHOTO.O3_1.s-1\n3600,', { mode: 'merge', emptyOverwrites: true })
    expect(result.columns['PHOTO#r-photo']).toEqual([1e-4, null])
  })

  it('merge mode does not add a row for a time with only empty cells', () => {
    expect(apply('time.s,PHOTO.O3_1.s-1\n60,', { mode: 'merge' }).times).toEqual([0, 3600])
  })

  it('ignores the deselected columns', () => {
    const table = baseTable()
    const result = applyConditionsUpload(
      table,
      upload('time.s,CONC.O3.mol m-3,CONC.NO2.mol m-3\n0,1,2', table),
      { keys: new Set(['CONC.NO2']), mode: 'replace' }
    )
    expect(result).toEqual({ times: [0], columns: { 'CONC.NO2.mol m-3': [2] } })
  })

  it('round-trips a download through an upload', () => {
    const table = baseTable()
    const [file] = buildConditionsFiles({ table, items: items(table) })
    const result = applyConditionsUpload(table, upload(file.text, table), {
      keys: allKeys(table),
      mode: 'replace',
    })
    expect(result.times).toEqual(table.times)
    Object.entries(table.columns).forEach(([header, values]) => {
      const uploaded = Object.keys(result.columns).find((h) => headerKey(h) === headerKey(header))
      expect(result.columns[uploaded]).toEqual(values)
    })
  })
})
