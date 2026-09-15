import { downloadJson } from '../../utils/downloadJson'
import { buildSolverConditions } from '../simulation/local/conditions'

// Builds the real music-box v1 wire format, so a downloaded config can be re-uploaded.
// Reuses buildSolverConditions, the same function Run Simulation uses, so the two match.
// Works with an empty mechanism too, as a blank template.
export function buildDownloadableConfig({ mechanism, conditions }) {
  return {
    'box model options': {
      'chemistry time step [sec]': conditions.basic.timeStep,
      'output time step [sec]': conditions.basic.outputFrequency,
      'simulation length [sec]': conditions.basic.duration,
    },
    conditions: buildSolverConditions(conditions),
    mechanism: {
      name: mechanism.selectedMechanism || 'custom',
      species: mechanism.species,
      reactions: mechanism.reactions,
      phases: mechanism.phases,
    },
    // Not part of the wire format; readers ignore it.
    metadata: {
      created: new Date().toISOString(),
      version: '1.0.0',
    },
  }
}

export function downloadConfig({ mechanism, conditions }) {
  const configuration = buildDownloadableConfig({ mechanism, conditions })
  downloadJson(configuration, `musicbox-config-${configuration.mechanism.name}-${Date.now()}.json`)
}
