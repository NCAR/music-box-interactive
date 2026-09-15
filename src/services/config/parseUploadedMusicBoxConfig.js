import { unzipSync } from 'fflate'
import { writeConfigFiles, readConfigFromFile } from '@ncar/music-box'

// __MACOSX/ and .DS_Store are artifacts of zipping a folder on macOS, not real config content.
const IGNORED_PATH_PATTERN = /(^|\/)(__MACOSX|\.DS_Store)(\/|$)/i

const isJsonPath = (path) => /\.json$/i.test(path)

// Errors here are user-facing: the message surfaces directly in the Upload Config toast.
export class ConfigUploadError extends Error {}

// Each upload gets its own directory so repeated uploads don't collide.
let uploadCounter = 0
const nextUploadDir = () => `/uploads/${Date.now()}-${++uploadCounter}`

function decodeZip(buffer) {
  const entries = unzipSync(new Uint8Array(buffer))
  const files = {}
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith('/') || data.length === 0) continue // directory entry
    if (IGNORED_PATH_PATTERN.test(path)) continue
    files[path] = data
  }
  return files
}

// Fails fast on a bad upload before anything is written into the virtual filesystem.
function assertLooksLikeAConfig(text) {
  let config
  try {
    config = JSON.parse(text)
  } catch (_error) {
    throw new ConfigUploadError('That file is not valid JSON.')
  }
  if (!config || typeof config !== 'object' || !config.mechanism || !config.conditions) {
    throw new ConfigUploadError(
      'Not a music-box configuration: missing "mechanism" or "conditions".'
    )
  }
  return config
}

async function resolveZipConfig(buffer) {
  const files = decodeZip(buffer)
  const jsonPaths = Object.keys(files).filter(isJsonPath)

  if (jsonPaths.length === 0) {
    throw new ConfigUploadError('That .zip does not contain a configuration JSON file.')
  }
  if (jsonPaths.length > 1) {
    throw new ConfigUploadError(
      `That .zip contains more than one JSON file (${jsonPaths.join(', ')}). Include only the ` +
        'configuration file.'
    )
  }

  const [configPath] = jsonPaths
  const decoder = new TextDecoder('utf-8')
  assertLooksLikeAConfig(decoder.decode(files[configPath]))

  const dir = nextUploadDir()
  await writeConfigFiles(dir, files)

  try {
    return await readConfigFromFile(`${dir}/${configPath}`)
  } catch (_error) {
    throw new ConfigUploadError(
      'Could not read one of this configuration’s referenced CSV files. Check that every ' +
        'file listed in "conditions.filepaths" is included in the zip, at the path the ' +
        'configuration names it by.'
    )
  }
}

// Parses an uploaded config file: a plain .json, or a .zip bundling it with its CSV files.
export async function parseUploadedMusicBoxConfig(file) {
  const name = file.name || ''

  if (/\.zip$/i.test(name)) {
    return resolveZipConfig(await file.arrayBuffer())
  }

  if (/\.json$/i.test(name)) {
    const config = assertLooksLikeAConfig(await file.text())
    const filepaths = config.conditions.filepaths
    if (Array.isArray(filepaths) && filepaths.length > 0) {
      throw new ConfigUploadError(
        `This configuration references external CSV files (${filepaths.join(', ')}). Upload a ` +
          '.zip containing the JSON file and those CSV files together instead.'
      )
    }
    return config
  }

  throw new ConfigUploadError(
    'Upload a .json configuration file, or a .zip bundling it with its CSV files.'
  )
}
