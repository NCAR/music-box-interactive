import { describe, it, expect } from 'vitest'
import {
  columnValues,
  commitTime,
  ensureZeroTimeRow,
  findHeader,
  insertTimeRow,
  removeTimeRows,
  renameTime,
  setCell,
  tableFromConditionsConfig,
} from '../src/services/conditions/table'

const table = () => ({
  times: [0, 100],
  columns: { 'ENV.temperature.K': [300, null], 'PHOTO.j.s-1': [1, 2] },
})

describe('tableFromConditionsConfig', () => {
  it('merges all the blocks by time and leaves unset cells null', () => {
    expect(
      tableFromConditionsConfig({
        data: [
          { headers: ['time.s', 'ENV.temperature.K', 'CONC.O3.mol m-3'], rows: [[0, 250, 1e-6]] },
          { headers: ['time.s', 'PHOTO.j.s-1'], rows: [[60, 2], [0, 1]] },
          { headers: ['time.s', 'CONC.O3'], rows: [[60, 3e-6]] },
        ],
      })
    ).toEqual({
      times: [0, 60],
      columns: {
        'ENV.temperature.K': [250, null],
        'CONC.O3.mol m-3': [1e-6, 3e-6],
        'PHOTO.j.s-1': [1, 2],
      },
    })
  })

  it('gives an empty table for no data', () => {
    expect(tableFromConditionsConfig(undefined)).toEqual({ times: [], columns: {} })
  })
})

describe('row operations', () => {
  it('inserts an empty row in time order', () => {
    expect(insertTimeRow(table(), 50)).toEqual({
      index: 1,
      table: {
        times: [0, 50, 100],
        columns: { 'ENV.temperature.K': [300, null, null], 'PHOTO.j.s-1': [1, null, 2] },
      },
    })
    expect(insertTimeRow(table(), 100)).toBeNull()
  })

  it('adds a t=0 row with the default temperature and pressure, and keeps set values', () => {
    expect(ensureZeroTimeRow({ times: [100], columns: { 'PHOTO.j.s-1': [2] } })).toEqual({
      times: [0, 100],
      columns: {
        'PHOTO.j.s-1': [null, 2],
        'ENV.temperature.K': [298.15, null],
        'ENV.pressure.Pa': [101325, null],
      },
    })
    expect(columnValues(ensureZeroTimeRow(table()), 'ENV.temperature.K')).toEqual([300, null])
  })

  it('removes rows from every column', () => {
    expect(removeTimeRows(table(), [0])).toEqual({
      removedCount: 1,
      removedTimes: [0],
      table: { times: [100], columns: { 'ENV.temperature.K': [null], 'PHOTO.j.s-1': [2] } },
    })
    expect(removeTimeRows(table(), [])).toBeNull()
  })

  it('moves a row with its values when its time changes', () => {
    expect(renameTime(table(), 0, 200).table).toEqual({
      times: [100, 200],
      columns: { 'ENV.temperature.K': [null, 300], 'PHOTO.j.s-1': [2, 1] },
    })
    expect(commitTime(table(), 0, '100')).toEqual({ kind: 'duplicate', newTime: 100 })
    expect(commitTime(table(), 0, '-1')).toEqual({ kind: 'invalid' })
    expect(commitTime(table(), 0, '0')).toEqual({ kind: 'unchanged' })
  })

  it('sets a cell and creates the column when necessary', () => {
    expect(setCell(table(), 'CONC.O3.mol m-3', 1, 5).columns['CONC.O3.mol m-3']).toEqual([null, 5])
    expect(setCell(table(), 'PHOTO.j.s-1', 0, NaN).columns['PHOTO.j.s-1']).toEqual([null, 2])
  })

  it('finds a header by its key', () => {
    expect(findHeader(table(), 'PHOTO.j')).toBe('PHOTO.j.s-1')
    expect(findHeader(table(), 'PHOTO.j.1/s')).toBe('PHOTO.j.s-1')
    expect(findHeader(table(), 'CONC.O3')).toBeUndefined()
  })
})
