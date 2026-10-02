// Saves a plot to a file or copies it to the clipboard (#623).
// The export is a copy of the plot SVG with these additions: the computed styles inlined, a
// background, the legend drawn in SVG, and the page font embedded. A PNG is that SVG drawn on a
// canvas.

const SVG_NS = 'http://www.w3.org/2000/svg'

// The styles that the plots set with CSS classes or CSS variables. A standalone SVG cannot
// resolve those, so the export writes the computed values on each element.
const STYLE_PROPERTIES = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'visibility',
]

const LEGEND_FONT_SIZE = 12
const LEGEND_ROW_HEIGHT = 22
const LEGEND_SWATCH_WIDTH = 16
const LEGEND_ITEM_GAP = 16
const LEGEND_PADDING = 12
// Space under the plot for the x-axis label, which sits a few pixels below the plot SVG.
const BOTTOM_ALLOWANCE = 12
// Space around the plot, so that labels at the edges do not touch the image border.
const BORDER = 12
const PNG_SCALE = 2

let fontCssPromise = null

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

// The Latin @font-face rules of the page font, with the font files as data URLs. A browser does
// not load web fonts for an SVG that it draws as an image, so the PNG needs them embedded.
// Returns '' when the fonts cannot load, and the export then uses a system font.
function embeddedFontCss() {
  fontCssPromise ??= (async () => {
    const link = document.querySelector('link[href*="fonts.googleapis.com/css"]')
    if (!link) return ''
    const css = await (await fetch(link.href)).text()
    const latinRules = css.match(/\/\* latin \*\/\s*@font-face\s*{[^}]*}/g) ?? []
    const rules = await Promise.all(
      latinRules.map(async (rule) => {
        const url = rule.match(/url\(([^)]+)\)/)?.[1]
        if (!url) return rule
        const dataUrl = await blobToDataUrl(await (await fetch(url)).blob())
        return rule.replace(url, dataUrl)
      })
    )
    return rules.join('\n')
  })().catch(() => '')
  return fontCssPromise
}

function inlineStyles(source, target) {
  const computed = getComputedStyle(source)
  const style = STYLE_PROPERTIES.map((name) => `${name}:${computed.getPropertyValue(name)}`)
  target.setAttribute('style', style.join(';'))
  for (let i = 0; i < source.children.length; i++) {
    inlineStyles(source.children[i], target.children[i])
  }
}

// The first background color that is not transparent, from the element up.
function backgroundOf(element) {
  for (let node = element; node; node = node.parentElement) {
    const color = getComputedStyle(node).backgroundColor
    if (color && color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) return color
  }
  return '#ffffff'
}

let measureContext = null
function textWidth(text, fontSize, fontFamily) {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) return text.length * fontSize * 0.6
  measureContext.font = `600 ${fontSize}px ${fontFamily}`
  return measureContext.measureText(text).width
}

// Rows of legend items that fit in the width. Each item is a short colored line and a name.
// An item without a color, such as "+N others", has no line.
function layoutLegend(entries, width, fontFamily) {
  const rows = []
  let row = { items: [], width: 0 }
  for (const entry of entries) {
    const swatchWidth = entry.color ? LEGEND_SWATCH_WIDTH + 6 : 0
    const itemWidth = swatchWidth + textWidth(entry.value, LEGEND_FONT_SIZE, fontFamily)
    const added = row.items.length === 0 ? itemWidth : row.width + LEGEND_ITEM_GAP + itemWidth
    if (row.items.length > 0 && added > width - 2 * LEGEND_PADDING) {
      rows.push(row)
      row = { items: [], width: 0 }
    }
    row.items.push({ ...entry, width: itemWidth })
    row.width = row.items.length === 1 ? itemWidth : row.width + LEGEND_ITEM_GAP + itemWidth
  }
  if (row.items.length > 0) rows.push(row)
  return rows
}

function appendLegend(root, rows, top, width, textColor, fontFamily) {
  const legend = document.createElementNS(SVG_NS, 'g')
  legend.setAttribute('font-family', fontFamily)
  legend.setAttribute('font-size', LEGEND_FONT_SIZE)
  legend.setAttribute('font-weight', '600')
  rows.forEach((row, rowIndex) => {
    const y = top + rowIndex * LEGEND_ROW_HEIGHT + LEGEND_ROW_HEIGHT / 2
    let x = (width - row.width) / 2
    for (const item of row.items) {
      const swatchWidth = item.color ? LEGEND_SWATCH_WIDTH + 6 : 0
      if (item.color) {
        const swatch = document.createElementNS(SVG_NS, 'line')
        swatch.setAttribute('x1', x)
        swatch.setAttribute('x2', x + LEGEND_SWATCH_WIDTH)
        swatch.setAttribute('y1', y)
        swatch.setAttribute('y2', y)
        swatch.setAttribute('stroke', item.color)
        swatch.setAttribute('stroke-width', 3)
        swatch.setAttribute('stroke-linecap', 'round')
        legend.appendChild(swatch)
      }

      const label = document.createElementNS(SVG_NS, 'text')
      label.setAttribute('x', x + swatchWidth)
      label.setAttribute('y', y)
      label.setAttribute('dy', '0.355em')
      label.setAttribute('fill', textColor)
      label.textContent = item.value
      legend.appendChild(label)

      x += item.width + LEGEND_ITEM_GAP
    }
  })
  root.appendChild(legend)
}

/**
 * Builds a standalone SVG document of a plot.
 * @param {SVGSVGElement} svg - The plot as it shows on the page
 * @param {{legend?: {value: string, color: string}[]}} [options]
 * @returns {Promise<{text: string, width: number, height: number}>}
 */
export async function buildPlotSvg(svg, { legend = [] } = {}) {
  const { width: plotWidth, height: plotHeight } = svg.getBoundingClientRect()
  const width = plotWidth + 2 * BORDER
  const computed = getComputedStyle(svg)
  const fontFamily = computed.fontFamily
  const textColor = computed.color

  const legendRows = legend.length > 0 ? layoutLegend(legend, width, fontFamily) : []
  const legendTop = BORDER + plotHeight + BOTTOM_ALLOWANCE
  const height =
    legendRows.length > 0
      ? legendTop + legendRows.length * LEGEND_ROW_HEIGHT + LEGEND_PADDING
      : legendTop + BORDER

  const root = document.createElementNS(SVG_NS, 'svg')
  root.setAttribute('xmlns', SVG_NS)
  root.setAttribute('width', width)
  root.setAttribute('height', height)
  root.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const fontCss = await embeddedFontCss()
  if (fontCss) {
    const style = document.createElementNS(SVG_NS, 'style')
    style.textContent = fontCss
    root.appendChild(style)
  }

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('width', width)
  background.setAttribute('height', height)
  background.setAttribute('fill', backgroundOf(svg))
  root.appendChild(background)

  const plot = svg.cloneNode(true)
  inlineStyles(svg, plot)
  plot.removeAttribute('class')
  plot.setAttribute('x', BORDER)
  plot.setAttribute('y', BORDER)
  plot.setAttribute('width', plotWidth)
  plot.setAttribute('height', plotHeight)
  // The line charts draw labels a little outside their box. The flow diagram clips its graph.
  plot.setAttribute('overflow', computed.overflow === 'visible' ? 'visible' : 'hidden')
  root.appendChild(plot)

  if (legendRows.length > 0) appendLegend(root, legendRows, legendTop, width, textColor, fontFamily)

  return { text: new XMLSerializer().serializeToString(root), width, height }
}

/** @returns {Promise<Blob>} A PNG of the SVG document, at twice the screen size. */
export async function svgToPng({ text, width, height }) {
  const image = new Image()
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
  await image.decode()

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * PNG_SCALE)
  canvas.height = Math.round(height * PNG_SCALE)
  const context = canvas.getContext('2d')
  context.scale(PNG_SCALE, PNG_SCALE)
  context.drawImage(image, 0, 0, width, height)

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The PNG is empty'))),
      'image/png'
    )
  )
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Chrome can still read the blob after the click, so the URL stays valid for a while.
  setTimeout(() => URL.revokeObjectURL(url), 40000)
}

export async function savePlot(svg, { legend, fileName, format }) {
  const plotSvg = await buildPlotSvg(svg, { legend })
  const blob =
    format === 'svg' ? new Blob([plotSvg.text], { type: 'image/svg+xml' }) : await svgToPng(plotSvg)
  downloadBlob(blob, `${fileName}.${format}`)
}

// Browsers put only PNG images on the clipboard. The ClipboardItem gets the PNG as a promise,
// because Safari allows a clipboard write only during the click event.
export async function copyPlot(svg, { legend }) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('This browser cannot copy images to the clipboard.')
  }
  const png = buildPlotSvg(svg, { legend }).then(svgToPng)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
}
