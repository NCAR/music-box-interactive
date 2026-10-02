import { solvePayload } from './solvePayload'
import { buildLocalSimulationPayload } from './payload'
import { normalizeSimulationResults } from './results'
import { BRANCH_TRACER_SUFFIXES, buildTracerSpeciesName } from './tracer'
import { store } from '../../../redux/store'
import {
  setExcludedResults,
  setMetadata,
  setResults,
  setStatus,
} from '../../../redux/slices/simulationSlice'

// Each tracer is named after the id of its Redux reaction, which the flux diagram and the
// reaction rate plots read it back with (see computeIntegratedReactionRate). The payload
// reactions have no id, so `reduxReactions` gives the reaction at the same index.
const addProductsToReactions = (reactions, reduxReactions) => {
  // Track the actual new product species names and their corresponding CONC keys
  const productSpeciesToAdd = []
  const productConcentrationKeys = []
  reactions.forEach((reaction, index) => {
    // Id-derived so it cannot collide with a real species name -- see ./tracer.js
    const prodName = buildTracerSpeciesName(reduxReactions[index], index)

    // Handle products
    if (Array.isArray(reaction.products)) {
      reaction.products.push({ name: prodName, coefficient: 1 })
      productSpeciesToAdd.push(prodName)
      productConcentrationKeys.push(`CONC.${prodName}.mol m-3`)
    }

    // Handle gas-phase products
    if (Array.isArray(reaction['gas-phase products'])) {
      reaction['gas-phase products'].push({ name: prodName, coefficient: 1 })
      productSpeciesToAdd.push(prodName)
      productConcentrationKeys.push(`CONC.${prodName}.mol m-3`)
    }

    // Handle alkoxy products
    if (Array.isArray(reaction['alkoxy products'])) {
      const alkoxyProdName = `${prodName}${BRANCH_TRACER_SUFFIXES[0]}`
      reaction['alkoxy products'].push({ name: alkoxyProdName, coefficient: 1 })
      productSpeciesToAdd.push(alkoxyProdName)
      productConcentrationKeys.push(`CONC.${alkoxyProdName}.mol m-3`)
    }

    // Handle nitrate products
    if (Array.isArray(reaction['nitrate products'])) {
      const nitrateProdName = `${prodName}${BRANCH_TRACER_SUFFIXES[1]}`
      reaction['nitrate products'].push({ name: nitrateProdName, coefficient: 1 })
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
    excludedResults.push({
      time: point.time,
      concentrations: excludedConcentrations,
      environment: point.environment,
    })
  }

  return {
    filteredResults,
    excludedResults,
  }
}

export const runLocalSimulation = async ({ mechanismData, conditions }) => {
  const { payload, mechanismLabel } = buildLocalSimulationPayload({ mechanismData, conditions })

  // Add tracking products to reactions and get concentration keys to exclude
  // The payload keeps the order of the Redux reactions, so the indices match.
  const { productSpeciesToAdd, productConcentrationKeys } = addProductsToReactions(
    payload.mechanism.reactions,
    mechanismData.config?.mechanism?.reactions ?? []
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

  // The solver runs in a Web Worker, so the UI stays responsive while it works.
  const rawResults = await solvePayload(payload)
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
