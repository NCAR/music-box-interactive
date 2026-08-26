import { parseCsvToBlock } from '@ncar/music-box'

export const expectedInitialConcentrations = (config, csvContents = []) => {
  const blocks = [
    ...(Array.isArray(config?.conditions?.data) ? config.conditions.data : []),
    ...csvContents
      .filter((content) => typeof content === 'string' && content.trim().length > 0)
      .map((content) => parseCsvToBlock(content)),
  ]

  const expected = {}

  for (const block of blocks) {
    if (!Array.isArray(block?.headers) || !Array.isArray(block?.rows) || block.rows.length === 0) {
      continue
    }

    // Only the t=0 row defines the initial state. The subsequent rows define evolving conditions.
    const timeIndex = block.headers.indexOf('time.s')
    const row = timeIndex === -1 ? block.rows[0] : block.rows.find((r) => r[timeIndex] === 0)
    if (!row) continue

    block.headers.forEach((header, index) => {
      if (header.startsWith('CONC.') && Number.isFinite(row[index])) {
        expected[header] = row[index]
      }
    })
  }

  return expected
}
