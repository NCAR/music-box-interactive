import { buildLocalSimulationPayload } from './payload'
import { BRANCH_TRACER_SUFFIXES, buildTracerSpeciesName } from './tracer'

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
      const alkoxyProdName = `${prodName}${BRANCH_TRACER_SUFFIXES[0]}`
      reaction['alkoxy products'].push({ 'species name': alkoxyProdName, coefficient: 1 })
      productSpeciesToAdd.push(alkoxyProdName)
      productConcentrationKeys.push(`CONC.${alkoxyProdName}.mol m-3`)
    }

    // Handle nitrate products
    if (Array.isArray(reaction['nitrate products'])) {
      const nitrateProdName = `${prodName}${BRANCH_TRACER_SUFFIXES[1]}`
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

/**
 * Builds a solver payload with a tracer species injected into every reaction, so the flow
 * diagram/flux/reaction-rate tabs can read each reaction's integrated rate back out. Used by
 * both the one-shot run path and the persistent-solver path, which must inject the exact same
 * tracers on every call for their tracer keys to stay meaningful.
 */
export const buildTracedSimulationPayload = ({ mechanismData, conditions }) => {
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

  return { payload, mechanismLabel, productConcentrationKeys }
}
