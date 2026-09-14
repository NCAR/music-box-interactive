import { downloadJson } from '../../utils/downloadJson'

// Same shape ReviewTab has always downloaded: works with an empty mechanism too, which
// doubles as a blank configuration template.
export function buildDownloadableConfig({ mechanism, conditions }) {
  return {
    mechanism: {
      name: mechanism.selectedMechanism || 'custom',
      species: mechanism.species,
      reactions: mechanism.reactions,
      phases: mechanism.phases,
    },
    conditions: {
      basic: conditions.basic,
      initial: conditions.initial,
      evolving: conditions.evolving,
    },
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
