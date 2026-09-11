import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

import { writeConfigFiles, resolveConditionsFilepathsFromFile } from '@ncar/music-box'
import { loadMusicBoxConfig } from '../services/config/loadMusicBoxConfig'

import chapmanConfig from '@ncar/music-box/examples/chapman/my_config.json' with { type: 'json' }
import analyticalConfig from '@ncar/music-box/examples/analytical/my_config.json' with { type: 'json' }
import ts1Config from '@ncar/music-box/examples/ts1/my_config.json' with { type: 'json' }
import flowTubeConfig from '@ncar/music-box/examples/flow_tube/my_config.json' with { type: 'json' }
import carbonBond5Config from '@ncar/music-box/examples/carbon_bond_5/my_config.json' with { type: 'json' }

// Every bundled example's CSV files, keyed by their absolute module path.
const exampleCsvModules = import.meta.glob('/node_modules/@ncar/music-box/examples/*/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
})

// Maps one example's CSVs to {relPath: text}, ready for writeConfigFiles.
function csvFilesForExample(exampleDir) {
  const marker = `/examples/${exampleDir}/`
  const files = {}
  for (const [path, text] of Object.entries(exampleCsvModules)) {
    const markerIndex = path.indexOf(marker)
    if (markerIndex === -1) continue
    files[path.slice(markerIndex + marker.length)] = text
  }
  return files
}

const examples = [
  {
    id: 'analytical',
    name: 'Analytical Mechanism',
    description: 'A simple analytical model for demonstration purposes',
    mechanism_name: analyticalConfig.mechanism.name,
    dir: 'analytical',
    config: analyticalConfig,
  },
  {
    id: 'chapman',
    name: 'Chapman Mechanism',
    description: 'Stratospheric oxygen chemistry with photolysis',
    mechanism_name: chapmanConfig.mechanism.name,
    dir: 'chapman',
    config: chapmanConfig,
  },
  {
    id: 'Flow-Tube Wall Loss',
    name: 'Flow-Tube Wall Loss',
    description:
      'A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor. ',
    mechanism_name: flowTubeConfig.mechanism.name,
    dir: 'flow_tube',
    config: flowTubeConfig,
  },
  {
    id: 'Full Gas-Phase Mechanism',
    name: 'Full Gas-Phase Mechanism',
    description:
      'A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system. The description of the modified version of CB-05 used in MONARCH',
    mechanism_name: carbonBond5Config.mechanism.name,
    dir: 'carbon_bond_5',
    config: carbonBond5Config,
  },
  {
    id: 'Troposphere-Stratosphere mechanism (TS1)',
    name: 'Troposphere-Stratosphere mechanism (TS1)',
    description:
      'A comprehensive model of the chemistry in the troposphere and stratosphere. Read about its formulation in this paper.',
    mechanism_name: ts1Config.mechanism.name,
    dir: 'ts1',
    config: ts1Config,
  },
]

/**
 * ExampleLoader Component
 * Loads pre-configured example simulations
 */
export function ExampleLoader() {
  const navigate = useNavigate()
  const [loading] = useState(false)
  const [error] = useState(null)
  const dispatch = useDispatch()

  const loadExample = async (example) => {
    // Write the CSVs in, then let @ncar/music-box resolve conditions.filepaths itself.
    const dir = `/examples/${example.dir}`
    await writeConfigFiles(dir, csvFilesForExample(example.dir))
    const config = await resolveConditionsFilepathsFromFile(example.config, dir)

    loadMusicBoxConfig(config, {
      dispatch,
      navigate,
      meta: {
        id: example.id,
        name: example.name,
        description: example.description,
        mechanism_name: example.mechanism_name,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Simulations</CardTitle>
        <CardDescription>
          Load pre-configured example simulations to get started quickly
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-900/20 backdrop-blur-lg border border-red-400/30 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
          {examples.map((example) => (
            <button
              key={example.id}
              type="button"
              onClick={() => loadExample(example)}
              disabled={loading}
              className="flex flex-col h-full text-left p-3 xs:p-4 border border-border rounded-lg hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50"
            >
              <h4 className="font-semibold text-sm">{example.name}</h4>
              <p className="text-xs text-gray-700 mt-1">{example.description}</p>
              <span className="mt-2 text-xs font-bold text-gray-900">
                {loading ? 'Loading...' : example.mechanism_name}
              </span>
            </button>
          ))}
        </div>

        {examples.length === 0 && !error && (
          <p className="text-center text-gray-500 py-4">No examples available</p>
        )}
      </CardContent>
    </Card>
  )
}

export default ExampleLoader
