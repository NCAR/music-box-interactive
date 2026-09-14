import { unzipSync } from 'fflate'
import { parseCsvToBlock } from '@ncar/music-box'

// __MACOSX/ and .DS_Store are artifacts of zipping a folder on macOS, not real config content.
const IGNORED_PATH_PATTERN = /(^|\/)(__MACOSX|\.DS_Store)(\/|$)/i

const isJsonPath = (path) => /\.json$/i.test(path)

// Errors here are user-facing: the message surfaces directly in the Upload Config toast.
export class ConfigUploadError extends Error {}

// Joins a CSV path from "conditions.filepaths" against the config file's own directory
// inside the zip, resolving "./" and "../" segments the same way Node's path.resolve does
// for the (Node-only) file-path loader in @ncar/music-box.
function joinZipPath(baseDir, relPath) {
  const rel = String(relPath).replace(/\\/g, '/').replace(/^\.\//, '')
  const combined = baseDir ? `${baseDir}/${rel}` : rel
  const parts = []
  for (const segment of combined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      parts.pop()
      continue
    }
    parts.push(segment)
  }
  return parts.join('/')
}

function dirnameOfZipPath(path) {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

// Validates the music-box v1 shape (the format @ncar/music-box and the Python
// acom_music_box tool both read). `requireResolvedFilepaths` rejects a plain JSON upload
// that references CSVs we don't have; the zip path resolves them first instead.
function parseWireConfig(text, { requireResolvedFilepaths }) {
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

  const filepaths = config.conditions.filepaths
  if (requireResolvedFilepaths && Array.isArray(filepaths) && filepaths.length > 0) {
    throw new ConfigUploadError(
      `This configuration references external CSV files (${filepaths.join(', ')}). Upload a ` +
        '.zip containing the JSON file and those CSV files together instead.'
    )
  }

  return config
}

function decodeZip(buffer) {
  const decoder = new TextDecoder('utf-8')
  const entries = unzipSync(new Uint8Array(buffer))
  const files = {}
  for (const [path, data] of Object.entries(entries)) {
    if (path.endsWith('/') || data.length === 0) continue // directory entry
    if (IGNORED_PATH_PATTERN.test(path)) continue
    files[path] = data
  }
  return { files, decoder }
}

function resolveZipConfig(files, decoder) {
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
  const config = parseWireConfig(decoder.decode(files[configPath]), {
    requireResolvedFilepaths: false,
  })

  const filepaths = Array.isArray(config.conditions?.filepaths) ? config.conditions.filepaths : []
  const configDir = dirnameOfZipPath(configPath)

  const csvBlocks = []
  const missing = []
  for (const relPath of filepaths) {
    const data = files[joinZipPath(configDir, relPath)]
    if (!data) {
      missing.push(relPath)
      continue
    }
    csvBlocks.push(parseCsvToBlock(decoder.decode(data)))
  }

  if (missing.length > 0) {
    throw new ConfigUploadError(
      `This configuration references CSV files not found in the zip: ${missing.join(', ')}.`
    )
  }

  // CSV-derived blocks are prepended, mirroring @ncar/music-box's own filepaths resolution,
  // so inline data (appended after) takes precedence at a shared time point.
  const existingData = Array.isArray(config.conditions?.data) ? config.conditions.data : []
  const { filepaths: _filepaths, ...conditionsWithoutFilepaths } = config.conditions

  return {
    ...config,
    conditions: {
      ...conditionsWithoutFilepaths,
      data: [...csvBlocks, ...existingData],
    },
  }
}

// Parses an uploaded music-box v1 config file into a fully-resolved config object -- a plain
// .json with no CSV references, or a .zip bundling the JSON with the CSV files its
// "conditions.filepaths" names -- ready to pass to loadMusicBoxConfig.
export async function parseUploadedMusicBoxConfig(file) {
  const name = file.name || ''

  if (/\.zip$/i.test(name)) {
    const buffer = await file.arrayBuffer()
    const { files, decoder } = decodeZip(buffer)
    return resolveZipConfig(files, decoder)
  }

  if (/\.json$/i.test(name)) {
    const text = await file.text()
    return parseWireConfig(text, { requireResolvedFilepaths: true })
  }

  throw new ConfigUploadError(
    'Upload a .json configuration file, or a .zip bundling it with its CSV files.'
  )
}
