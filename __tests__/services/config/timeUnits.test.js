import { describe, it, expect, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { parseBoxModelOptions } from '@ncar/music-box'
import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }

import mechanismReducer from '../../../src/redux/slices/mechanismSlice'
import conditionsReducer, { setTimeUnit } from '../../../src/redux/slices/conditionsSlice'
import simulationReducer from '../../../src/redux/slices/simulationSlice'
import { loadMusicBoxConfig } from '../../../src/services/config/loadMusicBoxConfig'
import { buildDownloadableConfig } from '../../../src/services/config/downloadConfig'
import { readTimeUnits, writeTimeUnits } from '../../../src/services/config/timeUnits'

const makeStore = () =>
  configureStore({
    reducer: {
      mechanism: mechanismReducer,
      conditions: conditionsReducer,
      simulation: simulationReducer,
    },
  })

describe('readTimeUnits', () => {
  it('reads the unit of each time field, aliases included', () => {
    expect(
      readTimeUnits({
        grid: 'box',
        'chemistry time step [s]': 1,
        'output time step [min]': 1,
        'simulation length [day]': 1,
      })
    ).toEqual({ timeStep: 'seconds', outputFrequency: 'minutes', duration: 'days' })
    expect(
      readTimeUnits({ 'chemistry time step [sec]': 1, 'simulation length [hr]': 1 })
    ).toEqual({ timeStep: 'seconds', duration: 'hours' })
  })

  it('leaves out a field with an unknown unit or no key', () => {
    expect(readTimeUnits({ 'simulation length [fortnight]': 1 })).toEqual({})
    expect(readTimeUnits(undefined)).toEqual({})
  })
})

describe('writeTimeUnits', () => {
  const seconds = {
    grid: 'box',
    'chemistry time step [sec]': 60,
    'output time step [sec]': 3600,
    'simulation length [sec]': 2592000,
    'max iterations': 1000,
  }

  it('writes each time in the selected unit and keeps the key order', () => {
    const options = writeTimeUnits(seconds, {
      timeStep: 'minutes',
      outputFrequency: 'hours',
      duration: 'days',
    })
    expect(options).toEqual({
      grid: 'box',
      'chemistry time step [min]': 1,
      'output time step [hour]': 1,
      'simulation length [day]': 30,
      'max iterations': 1000,
    })
    expect(Object.keys(options)).toEqual([
      'grid',
      'chemistry time step [min]',
      'output time step [hour]',
      'simulation length [day]',
      'max iterations',
    ])
  })

  it('keeps seconds for a time that does not convert exactly', () => {
    // 29 / 86400 * 86400 is 28.999999999999996, so a [day] key would change the time.
    const options = writeTimeUnits({ 'chemistry time step [sec]': 29 }, { timeStep: 'days' })
    expect(options).toEqual({ 'chemistry time step [sec]': 29 })
  })

  it('keeps seconds when no unit is selected', () => {
    expect(writeTimeUnits(seconds, undefined)).toEqual(seconds)
  })
})

describe('time units round trip', () => {
  it('a loaded config downloads with the same time keys and values', async () => {
    const store = makeStore()
    await loadMusicBoxConfig(chapmanConfig, { dispatch: store.dispatch, navigate: vi.fn() })

    const { mechanism, conditions } = store.getState()
    expect(conditions.timeUnits).toEqual({
      duration: 'days',
      timeStep: 'minutes',
      outputFrequency: 'minutes',
    })

    const downloaded = buildDownloadableConfig({ mechanism, conditions })
    expect(downloaded['box model options']).toMatchObject(chapmanConfig['box model options'])
    const { chemTimeStep, outputTimeStep, simulationLength } = parseBoxModelOptions(chapmanConfig)
    expect(parseBoxModelOptions(downloaded)).toMatchObject({
      chemTimeStep,
      outputTimeStep,
      simulationLength,
    })
  })

  it('a unit selected on the Time tab goes into the download', async () => {
    const store = makeStore()
    await loadMusicBoxConfig(chapmanConfig, { dispatch: store.dispatch, navigate: vi.fn() })
    store.dispatch(setTimeUnit({ field: 'duration', unitId: 'hours' }))

    const { mechanism, conditions } = store.getState()
    const options = buildDownloadableConfig({ mechanism, conditions })['box model options']
    expect(options['simulation length [hour]']).toBe(72)
    expect(options).not.toHaveProperty('simulation length [day]')
  })
})
