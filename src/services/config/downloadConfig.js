import { downloadJson } from '../../utils/downloadJson'
import { buildLocalSimulationPayload } from '../simulation/local/payload'

// Builds the same payload Run Simulation solves -- assembled via musica's own builder classes,
// not hand-written -- so a downloaded config always matches what MusicBox actually runs.
export function buildDownloadableConfig({ mechanism, conditions }) {
  const { payload } = buildLocalSimulationPayload({ mechanismData: mechanism, conditions })

  return {
    ...payload,
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
