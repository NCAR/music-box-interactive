import { downloadJson } from '../../utils/downloadJson'
import { buildSolverConditions } from '../simulation/local/conditions'

// Downloads the real music-box v1 wire format -- the same format Upload Config reads and
// the solver itself runs -- so a downloaded config can be re-uploaded. Reuses
// buildSolverConditions for conditions.data, the exact function that builds what Run
// Simulation would send to the solver, so the two can never drift apart.
// Works with an empty mechanism too, which doubles as a blank configuration template.
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
    // Not part of the wire format; loadMusicBoxConfig/parseUploadedMusicBoxConfig ignore it.
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
