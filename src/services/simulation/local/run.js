import { MusicBox } from '@ncar/music-box'
import { buildTracedSimulationPayload } from './tracedPayload'
import { filterProductConcentrations } from './filterProductConcentrations'
import { normalizeSimulationResults } from './results'
import { store } from '../../../redux/store'
import {
  setExcludedResults,
  setMetadata,
  setResults,
  setStatus,
} from '../../../redux/slices/simulationSlice'

export const runLocalSimulation = async ({ mechanismData, conditions }) => {
  const { payload, mechanismLabel, productConcentrationKeys } = buildTracedSimulationPayload({
    mechanismData,
    conditions,
  })

  const rawResults = await MusicBox.fromJson(payload).solve()
  const normalizedPoints = normalizeSimulationResults(rawResults)

  if (normalizedPoints.length === 0) {
    throw new Error('No valid results after normalization')
  }

  // Filter out product concentration keys from results so flow diagram works correctly
  const { filteredResults, excludedResults } = filterProductConcentrations(
    normalizedPoints,
    productConcentrationKeys
  )

  if (filteredResults.length > 0) {
    store.dispatch(setResults(filteredResults))
    store.dispatch(setExcludedResults(excludedResults))
    store.dispatch(
      setMetadata({
        mechanism: mechanismLabel,
        duration: conditions.basic.duration || 0,
      })
    )
    store.dispatch(setStatus('succeeded'))
  } else {
    console.error('No valid results after normalization')
    store.dispatch(setExcludedResults([]))
    store.dispatch(setStatus('failed'))
  }

  return {
    results: filteredResults,
    excludedResults,
    metadata: {
      mechanism: mechanismLabel,
      duration: conditions.basic.duration || 0,
    },
    payload,
  }
}
