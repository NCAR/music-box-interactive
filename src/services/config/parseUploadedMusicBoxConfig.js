import { unzipSync } from 'fflate'
import {
  initModule,
  mechanismConfiguration,
  writeConfigFiles,
  readConfigFromFile,
} from '@ncar/music-box'

// __MACOSX/ and .DS_Store are artifacts of zipping a folder on macOS, not real config content.
const IGNORED_PATH_PATTERN = /(^|\/)(__MACOSX|\.DS_Store)(\/|$)/i

const isJsonPath = (path) => /\.json$/i.test(path)
const isYamlPath = (path) => /\.ya?ml$/i.test(path)
const isConfigTextPath = (path) => isJsonPath(path) || isYamlPath(path)

// MUSICA writes the files into this directory before it parses them. The path means nothing to
// the user, so it is removed from the parser messages.
const MUSICA_PARSE_DIR_PATTERN = /\/musica_parse_tmp\//g

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

const parseJsonOrNull = (text) => {
  try {
    return JSON.parse(text)
  } catch (_error) {
    return null
  }
}

const isObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

// A music-box configuration has "mechanism" and "conditions" at the top level. A mechanism
// configuration has neither.
const isMusicBoxConfigAttempt = (value) =>
  isObject(value) && ('mechanism' in value || 'conditions' in value)

// Fails fast on a bad upload before anything is written into the virtual filesystem.
function assertLooksLikeAConfig(config) {
  if (!config.mechanism || !config.conditions) {
    throw new ConfigUploadError(
      'Not a music-box configuration: missing "mechanism" or "conditions".'
    )
  }
  return config
}

// The entry point of a mechanism configuration has a top-level "version" (v1) or "camp-files"
// (v0) key. The files that it includes are lists or "camp-data" objects.
const ENTRY_KEYS = ['version', 'camp-files']
const YAML_ENTRY_KEY_PATTERN = /^["']?(version|camp-files)["']?\s*:/m

function isMechanismEntryPoint(path, text) {
  if (isYamlPath(path)) return YAML_ENTRY_KEY_PATTERN.test(text)
  const value = parseJsonOrNull(text)
  return isObject(value) && ENTRY_KEYS.some((key) => key in value)
}

// Parses a mechanism configuration with MUSICA. `files` maps each path to its text, and
// `entryPoint` names the file that includes the others. Resolves to a music-box configuration
// that holds only the mechanism.
async function parseMechanismFiles(files, entryPoint) {
  await initModule()
  let mechanism
  try {
    mechanism = mechanismConfiguration.parseMechanismFromFiles(files, entryPoint)
  } catch (error) {
    const message = String(error?.message || error)
      .replace(MUSICA_PARSE_DIR_PATTERN, '')
      .trim()
    const hint = /File not found/.test(message)
      ? ' This mechanism is split across files. Upload a .zip that holds all of them.'
      : ''
    throw new ConfigUploadError(`Could not read the mechanism configuration: ${message}${hint}`)
  }
  // MUSICA converts a v0 mechanism to the v1 format, but it keeps version 0.0.0. The v1
  // parser that loads the mechanism into the app does not accept that version.
  if (/^0\./.test(mechanism.version)) mechanism = { ...mechanism, version: '1.0.0' }
  return { mechanism }
}

async function resolveZipMusicBoxConfig(files, configPath) {
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

async function resolveZipConfig(buffer) {
  const files = decodeZip(buffer)
  const decoder = new TextDecoder('utf-8')
  const texts = Object.fromEntries(
    Object.keys(files)
      .filter(isConfigTextPath)
      .map((path) => [path, decoder.decode(files[path])])
  )

  const musicBoxConfigPaths = Object.keys(texts).filter(
    (path) => isJsonPath(path) && isMusicBoxConfigAttempt(parseJsonOrNull(texts[path]))
  )
  if (musicBoxConfigPaths.length > 1) {
    throw new ConfigUploadError(
      `That .zip contains more than one music-box configuration ` +
        `(${musicBoxConfigPaths.join(', ')}). Include only one.`
    )
  }
  if (musicBoxConfigPaths.length === 1) {
    const [configPath] = musicBoxConfigPaths
    assertLooksLikeAConfig(JSON.parse(texts[configPath]))
    return resolveZipMusicBoxConfig(files, configPath)
  }

  const entryPoints = Object.keys(texts).filter((path) => isMechanismEntryPoint(path, texts[path]))
  if (entryPoints.length === 0) {
    throw new ConfigUploadError(
      'That .zip does not contain a music-box configuration or a mechanism configuration.'
    )
  }
  if (entryPoints.length > 1) {
    throw new ConfigUploadError(
      `That .zip contains more than one mechanism configuration (${entryPoints.join(', ')}). ` +
        'Include only one.'
    )
  }
  return parseMechanismFiles(texts, entryPoints[0])
}

// Parses an uploaded file into a music-box configuration. The file is one of:
//   - a music-box configuration (.json)
//   - a mechanism configuration (.json, .yaml, or .yml). The result holds only the mechanism.
//   - a .zip that holds a music-box configuration and its CSV files, or a mechanism
//     configuration split across files.
export async function parseUploadedMusicBoxConfig(file) {
  const name = file.name || ''

  if (/\.zip$/i.test(name)) {
    return resolveZipConfig(await file.arrayBuffer())
  }

  if (isJsonPath(name)) {
    const text = await file.text()
    const config = parseJsonOrNull(text)
    if (config === null) {
      throw new ConfigUploadError('That file is not valid JSON.')
    }
    if (!isMusicBoxConfigAttempt(config)) {
      return parseMechanismFiles({ [name]: text }, name)
    }
    assertLooksLikeAConfig(config)
    const filepaths = config.conditions.filepaths
    if (Array.isArray(filepaths) && filepaths.length > 0) {
      throw new ConfigUploadError(
        `This configuration references external CSV files (${filepaths.join(', ')}). Upload a ` +
          '.zip containing the JSON file and those CSV files together instead.'
      )
    }
    return config
  }

  if (isYamlPath(name)) {
    return parseMechanismFiles({ [name]: await file.text() }, name)
  }

  throw new ConfigUploadError(
    'Upload a music-box configuration (.json), a mechanism configuration (.json or .yaml), ' +
      'or a .zip of either one split across files.'
  )
}
