import { MusicBox } from '@ncar/music-box'
import { buildLocalSimulationPayload } from './payload'
import { normalizeSimulationResults } from './results'
import { buildTracerSpeciesName } from './tracer'
import { store } from '../../../redux/store'
import {
  setExcludedResults,
  setMetadata,
  setResults,
  setStatus,
} from '../../../redux/slices/simulationSlice'

const addProductsToReactions = (reactions) => {
  // Track the actual new product species names and their corresponding CONC keys
  const productSpeciesToAdd = []
  const productConcentrationKeys = []
  reactions.forEach((reaction, index) => {
    // Index-derived so it cannot collide with a real species name -- see ./tracer.js
    const prodName = buildTracerSpeciesName(index, reaction.name)

    // Handle products
    if (Array.isArray(reaction.products)) {
      reaction.products.push({ 'species name': prodName, coefficient: 1 })
      productSpeciesToAdd.push(prodName)
      productConcentrationKeys.push(`CONC.${prodName}.mol m-3`)
    }

    // Handle gas-phase products
    if (Array.isArray(reaction['gas-phase products'])) {
      reaction['gas-phase products'].push({ 'species name': prodName, coefficient: 1 })
      productSpeciesToAdd.push(prodName)
      productConcentrationKeys.push(`CONC.${prodName}.mol m-3`)
    }

    // Handle alkoxy products
    if (Array.isArray(reaction['alkoxy products'])) {
      const alkoxyProdName = `${prodName}_A`
      reaction['alkoxy products'].push({ 'species name': alkoxyProdName, coefficient: 1 })
      productSpeciesToAdd.push(alkoxyProdName)
      productConcentrationKeys.push(`CONC.${alkoxyProdName}.mol m-3`)
    }

    // Handle nitrate products
    if (Array.isArray(reaction['nitrate products'])) {
      const nitrateProdName = `${prodName}_B`
      reaction['nitrate products'].push({ 'species name': nitrateProdName, coefficient: 1 })
      productSpeciesToAdd.push(nitrateProdName)
      productConcentrationKeys.push(`CONC.${nitrateProdName}.mol m-3`)
    }
  })

  return {
    productSpeciesToAdd,
    productConcentrationKeys,
  }
}

const filterProductConcentrations = (results, excludeConcentrationKeys) => {
  const excludeSet = new Set(excludeConcentrationKeys)
  const filteredResults = []
  const excludedResults = []

  for (const point of results) {
    if (!point || typeof point !== 'object' || !point.concentrations) {
      filteredResults.push(point)
      excludedResults.push({})
      continue
    }

    const filteredConcentrations = {}
    const excludedConcentrations = {}

    for (const [key, value] of Object.entries(point.concentrations)) {
      if (excludeSet.has(key)) {
        excludedConcentrations[key] = value
      } else {
        filteredConcentrations[key] = value
      }
    }

    filteredResults.push({ ...point, concentrations: filteredConcentrations })
    excludedResults.push({ time: point.time, concentrations: excludedConcentrations })
  }

  return {
    filteredResults,
    excludedResults,
  }
}

export const runLocalSimulation = async ({ mechanismData, conditions }) => {
  const { payload, mechanismLabel } = buildLocalSimulationPayload({ mechanismData, conditions })

  // Add tracking products to reactions and get concentration keys to exclude
  const { productSpeciesToAdd, productConcentrationKeys } = addProductsToReactions(
    payload.mechanism.reactions
  )

  const species = Array.isArray(payload?.mechanism?.species) ? payload.mechanism.species : []

  productSpeciesToAdd.forEach((prodName) => {
    if (!species.some((sp) => sp?.name === prodName)) {
      species.push({ name: prodName })
    }
  })

  payload.mechanism.species = species

  const phases = Array.isArray(payload?.mechanism?.phases) ? payload.mechanism.phases : []

  if (phases.length > 0) {
    const targetPhase =
      phases.find((phase) => String(phase?.name || '').toLowerCase() === 'gas') || phases[0]
    const phaseSpecies = Array.isArray(targetPhase?.species) ? targetPhase.species : []

    productSpeciesToAdd.forEach((prodName) => {
      const exists = phaseSpecies.some(
        (sp) => (typeof sp === 'string' ? sp : sp?.name) === prodName
      )
      if (!exists) {
        phaseSpecies.push({ name: prodName })
      }
    })

    targetPhase.species = phaseSpecies
    payload.mechanism.phases = phases
  }

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
