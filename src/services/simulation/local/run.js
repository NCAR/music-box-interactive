import { MusicBox } from '@ncar/music-box'
import { buildLocalSimulationPayload } from './payload'
import { normalizeSimulationResults } from './results'

export const runLocalSimulation = async ({ mechanismData, conditions }) => {
  const {
    payload,
    mechanismLabel,
  } = buildLocalSimulationPayload({ mechanismData, conditions })
  console.log('finalMechanism', payload)
  const rawResults = await MusicBox.fromJson(payload).solve()
  const normalizedPoints = normalizeSimulationResults(rawResults)

  if (normalizedPoints.length === 0) {
    throw new Error('No valid results after normalization')
  }

  return {
    results: normalizedPoints,
    metadata: {
      mechanism: mechanismLabel,
      duration: conditions.basic.duration || 0,
    },
    payload,
  }
}
