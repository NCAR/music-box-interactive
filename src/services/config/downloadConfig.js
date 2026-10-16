import { downloadJson } from '../../utils/downloadJson'
import { buildLocalSimulationPayload } from '../simulation/local/payload'
import { writeTimeUnits } from './timeUnits'

// Builds the same payload Run Simulation solves -- assembled via musica's own builder classes,
// not hand-written -- so a downloaded config always matches what MusicBox actually runs.
export function buildDownloadableConfig({ mechanism, conditions }) {
  const { payload } = buildLocalSimulationPayload({ mechanismData: mechanism, conditions })

  return {
    ...payload,
    // Each time is in the unit that the user selected on the Time tab.
    'box model options': writeTimeUnits(payload['box model options'], conditions.timeUnits),
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
