import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { scaleLinear, scaleLog, line, curveMonotoneX, bisectCenter } from 'd3'
import { useChartTheme } from '../../theme/chartTheme'
import { TICK_COUNT, fixedDomainTicks, niceTicks, preserveEndLabels } from './chartTicks'
import { PlotExportButtons } from './PlotExportButtons'

// A line chart drawn as plain SVG with d3 scales. It replaces Recharts, which copies each data
// row into every line point: a plot with hundreds of species took seconds to redraw. Here each
// line is one <path> string, and React redraws only the lines whose data changed. The axes,
// the ticks and the tooltip copy what Recharts did, so the plots look the same as before.

const TICK_SIZE = 6
const TICK_MARGIN = 2
const X_AXIS_HEIGHT = 30
const Y_AXIS_WIDTH = 60
const LABEL_OFFSET = 5
const CURSOR_COLOR = '#ccc'
const TOOLTIP_OFFSET = 10
const ACTIVE_DOT_RADIUS = 4
const NO_PADDING = { top: 0, bottom: 0 }

const isValue = (value) => typeof value === 'number' && Number.isFinite(value)

// The number formats that Recharts used when an axis has no tick formatter.
const defaultTickFormat = (value) => String(value)

let measureContext = null
function textWidth(text, fontSize, fontFamily) {
  measureContext ??= document.createElement('canvas').getContext('2d')
  if (!measureContext) return text.length * fontSize * 0.6
  measureContext.font = `${fontSize}px ${fontFamily}`
  return measureContext.measureText(text).width
}

function extent(values, positiveOnly) {
  let min = Infinity
  let max = -Infinity
  for (const value of values) {
    if (!isValue(value) || (positiveOnly && value <= 0)) continue
    if (value < min) min = value
    if (value > max) max = value
  }
  return min <= max ? [min, max] : null
}

// The domain and the ticks of a number axis.
// `domain` is 'auto' (from zero to the data, rounded out to nice ticks), a fixed [low, high]
// that grows to hold the data, or a function of the data extent.
function resolveAxis({ scale = 'linear', domain = 'auto', ticks }, dataExtent) {
  const isLog = scale === 'log'
  let resolved
  if (typeof domain === 'function') {
    resolved = dataExtent ? domain(...dataExtent) : isLog ? [1e-20, 1] : [0, 1]
  } else if (Array.isArray(domain)) {
    resolved = dataExtent
      ? [Math.min(domain[0], dataExtent[0]), Math.max(domain[1], dataExtent[1])]
      : domain
  } else {
    const [min, max] = dataExtent ?? [0, 0]
    const auto = niceTicks([Math.min(0, min), max])
    return { domain: [auto[0], auto.at(-1)], ticks: ticks ?? auto }
  }

  if (isLog) {
    return { domain: resolved, ticks: ticks ?? scaleLog().domain(resolved).ticks(TICK_COUNT) }
  }
  return { domain: resolved, ticks: ticks ?? fixedDomainTicks(resolved) }
}

// The saved plot shows the legend as the page does: the first entries, then "+N others".
function exportLegend(entries, maxVisible) {
  if (entries.length <= maxVisible) return entries
  const others = entries.length - maxVisible
  return [...entries.slice(0, maxVisible), { value: `+${others} others`, color: null }]
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}

const SeriesLine = memo(function SeriesLine({ d, color, strokeWidth, dots, dotRadius }) {
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} />
      {dots?.map(([cx, cy], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={dotRadius}
          fill="#fff"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      ))}
    </g>
  )
})

// The place for one tooltip edge, as Recharts does it: after the point, or before it when the
// tooltip does not fit, but never before the start of the plot.
function tooltipEdge(point, size, start, end) {
  const after = point + TOOLTIP_OFFSET
  if (after + size <= end) return Math.max(after, start)
  return Math.max(point - TOOLTIP_OFFSET - size, start)
}

// The hover layer is its own component, so a mouse move redraws the cursor and the tooltip only.
function HoverLayer({ x, series, xScale, yScales, plot, width, height, renderTooltip }) {
  const [hover, setHover] = useState(null)
  const tooltipRef = useRef(null)

  const onMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const time = xScale.invert(event.clientX - bounds.left + plot.left)
    setHover({ index: bisectCenter(x, time), mouseY: event.clientY - bounds.top + plot.top })
  }

  const index = hover?.index ?? null
  const cursorX = index === null ? null : xScale(x[index])
  const shown = index === null ? [] : series.filter((s) => isValue(s.values[index]))

  // The tooltip size is known only after it renders, so this places it before the paint.
  useLayoutEffect(() => {
    const element = tooltipRef.current
    if (!element || cursorX === null) return
    const left = tooltipEdge(cursorX, element.offsetWidth, plot.left, plot.right)
    const top = tooltipEdge(hover.mouseY, element.offsetHeight, plot.top, plot.bottom)
    element.style.transform = `translate(${left}px, ${top}px)`
  })

  return (
    <>
      <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
        {cursorX !== null && (
          <>
            <line x1={cursorX} x2={cursorX} y1={plot.top} y2={plot.bottom} stroke={CURSOR_COLOR} />
            {shown.map((s) => (
              <circle
                key={s.key}
                cx={cursorX}
                cy={yScales[s.axis](s.values[index])}
                r={ACTIVE_DOT_RADIUS}
                fill={s.color}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </>
        )}
      </svg>
      <div
        className="absolute"
        style={{
          left: plot.left,
          top: plot.top,
          width: plot.right - plot.left,
          height: plot.bottom - plot.top,
        }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      />
      {index !== null && renderTooltip && (
        <div
          ref={tooltipRef}
          className="absolute left-0 top-0 pointer-events-none"
          style={{ zIndex: 10 }}
        >
          {renderTooltip({
            label: x[index],
            payload: shown.map((s) => ({ name: s.name, value: s.values[index], color: s.color })),
          })}
        </div>
      )}
    </>
  )
}

function YAxis({ axis, scale, ticks, plot, chart, height }) {
  const left = axis.side !== 'right'
  const color = axis.color ?? chart.axis
  const axisX = left ? plot.left : plot.right
  const sign = left ? -1 : 1
  const tickFormat = axis.tickFormat ?? defaultTickFormat

  // Recharts puts the label inside the axis box, `labelOffset` from its outer edge.
  const offset = axis.labelOffset ?? LABEL_OFFSET
  const labelX = left ? axisX - axis.width + offset : axisX + axis.width - offset
  const anchor = axis.labelAnchor ?? (left ? 'start' : 'end')
  const middleY = (plot.top + plot.bottom) / 2

  return (
    <g>
      <line x1={axisX} x2={axisX} y1={plot.top} y2={plot.bottom} stroke={color} />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${axisX},${scale(tick)})`}>
          <line x2={sign * TICK_SIZE} stroke={color} />
          <text
            x={sign * (TICK_SIZE + TICK_MARGIN)}
            dy="0.355em"
            textAnchor={left ? 'end' : 'start'}
            fill={axis.tickColor ?? color}
            fontSize={axis.tickFontSize}
          >
            {tickFormat(tick)}
          </text>
        </g>
      ))}
      {axis.label && height > 0 && (
        <text
          transform={`translate(${labelX},${middleY}) rotate(${left ? -90 : 90})`}
          dy="0.355em"
          textAnchor={anchor}
          fill={axis.labelColor ?? chart.label}
          fontWeight={600}
          fontSize={axis.labelFontSize}
        >
          {axis.label}
        </text>
      )}
    </g>
  )
}

/**
 * @param {number[]} x - The x value of each point, shared by all series, in increasing order
 * @param {{key: string, name: string, color: string, values: number[], axis?: string}[]} series
 *   A value that is not a finite number is a gap, and the line joins the points on each side.
 * @param {Object} xAxis - {type: 'number' | 'category', domain, ticks, tickFormat, label, ...}
 *   A category axis puts a tick and a grid line at each point, as Recharts did.
 * @param {Object[]} yAxes - [{id, side, scale: 'linear' | 'log', domain, tickFormat, label, ...}]
 * @param {Function} [renderTooltip] - ({ label, payload }) => node, payload as {name, value, color}
 * @param {Function} [renderLegend] - (payload) => node, payload as {value, color}, sorted by name
 * @param {number} [legendMaxVisible] - Legend entries before "+N others", in the saved plot too
 * @param {string} [exportName] - Shows the Copy and Save buttons, and names the saved file
 */
export function LineChart({
  x,
  series,
  margin,
  xAxis,
  yAxes,
  strokeWidth,
  showDots = false,
  dotRadius,
  legendPaddingTop,
  renderTooltip,
  renderLegend,
  legendMaxVisible = Infinity,
  exportName,
}) {
  const chart = useChartTheme()
  const svgBoxRef = useRef(null)
  const svgRef = useRef(null)
  const { width, height } = useElementSize(svgBoxRef)

  const axes = useMemo(
    () => yAxes.map((axis) => ({ width: Y_AXIS_WIDTH, padding: NO_PADDING, ...axis })),
    [yAxes]
  )
  const leftAxis = axes.find((axis) => axis.side !== 'right')
  const rightAxis = axes.find((axis) => axis.side === 'right')
  const firstAxisId = axes[0]?.id

  const hasLegend = Boolean(renderLegend) && series.length > 0

  const plot = {
    left: margin.left + (leftAxis?.width ?? 0),
    right: width - margin.right - (rightAxis?.width ?? 0),
    top: margin.top,
    // With a legend, the bottom margin goes below the legend, as in Recharts.
    bottom: height - (hasLegend ? 0 : margin.bottom) - X_AXIS_HEIGHT,
  }

  const plotted = useMemo(
    () => series.map((s) => ({ ...s, axis: s.axis ?? firstAxisId })),
    [series, firstAxisId]
  )

  const xResolved = useMemo(() => {
    if (xAxis.type === 'category') {
      return { domain: [x[0] ?? 0, x.at(-1) ?? 1], ticks: x }
    }
    return resolveAxis(xAxis, extent(x, false))
  }, [xAxis, x])

  const xScale = useMemo(
    () => scaleLinear().domain(xResolved.domain).range([plot.left, plot.right]),
    [xResolved, plot.left, plot.right]
  )

  // One scale for each y axis, from the series on that axis.
  const yResolved = useMemo(
    () =>
      Object.fromEntries(
        axes.map((axis) => {
          const values = plotted.filter((s) => s.axis === axis.id).flatMap((s) => s.values)
          return [axis.id, resolveAxis(axis, extent(values, axis.scale === 'log'))]
        })
      ),
    [axes, plotted]
  )

  const yScales = useMemo(
    () =>
      Object.fromEntries(
        axes.map((axis) => {
          const make = axis.scale === 'log' ? scaleLog : scaleLinear
          const range = [plot.bottom - axis.padding.bottom, plot.top + axis.padding.top]
          return [axis.id, make().domain(yResolved[axis.id].domain).range(range)]
        })
      ),
    [axes, yResolved, plot.bottom, plot.top]
  )

  const paths = useMemo(() => {
    if (width === 0 || height === 0) return []
    return plotted.map((s) => {
      const yScale = yScales[s.axis]
      const points = []
      s.values.forEach((value, index) => {
        if (isValue(value)) points.push([xScale(x[index]), yScale(value)])
      })
      return {
        key: s.key,
        color: s.color,
        d: line().curve(curveMonotoneX)(points),
        dots: showDots ? points : null,
      }
    })
  }, [plotted, x, xScale, yScales, showDots, width, height])

  // The x tick labels that fit, measured in the font of the page.
  const xTickFormat = xAxis.tickFormat ?? defaultTickFormat
  const xTicks = useMemo(() => {
    if (width === 0) return []
    const fontFamily = getComputedStyle(svgBoxRef.current).fontFamily
    const ticks = xResolved.ticks.map((value) => {
      const label = xTickFormat(value)
      return {
        value,
        label,
        coordinate: xScale(value),
        width: textWidth(label, xAxis.tickFontSize, fontFamily),
      }
    })
    const positions = preserveEndLabels(ticks, 0, width)
    return ticks.map((tick, index) => ({ ...tick, labelX: positions[index] }))
  }, [xResolved, xScale, xTickFormat, xAxis.tickFontSize, width])

  const labeledXTicks = xTicks.filter((tick) => tick.labelX !== null)

  const legendPayload = useMemo(
    () =>
      series
        .map((s) => ({ value: s.name, color: s.color }))
        .sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0)),
    [series]
  )

  const gridAxisId = leftAxis?.id ?? firstAxisId
  const ready = width > 0 && height > 0 && plot.right > plot.left && plot.bottom > plot.top

  return (
    <div className="flex h-full w-full flex-col">
      <div ref={svgBoxRef} className="relative min-h-0 flex-1">
        {ready && (
          <>
            <svg
              ref={svgRef}
              width={width}
              height={height}
              className="absolute inset-0 overflow-visible"
            >
              <g stroke={chart.grid} strokeDasharray="3 3">
                <line x1={plot.left} x2={plot.right} y1={plot.top} y2={plot.top} />
                {gridAxisId !== undefined &&
                  yResolved[gridAxisId].ticks.map((tick) => (
                    <line
                      key={`h${tick}`}
                      x1={plot.left}
                      x2={plot.right}
                      y1={yScales[gridAxisId](tick)}
                      y2={yScales[gridAxisId](tick)}
                    />
                  ))}
                {/* Grid lines only at the labeled ticks, as Recharts drew them. */}
                {labeledXTicks.map((tick) => (
                  <line
                    key={`v${tick.value}`}
                    x1={tick.coordinate}
                    x2={tick.coordinate}
                    y1={plot.top}
                    y2={plot.bottom}
                  />
                ))}
              </g>

              <g>
                <line
                  x1={plot.left}
                  x2={plot.right}
                  y1={plot.bottom}
                  y2={plot.bottom}
                  stroke={chart.axis}
                />
                {xTicks.map(
                  (tick) =>
                    // A tick without a label has no tick mark either.
                    tick.labelX !== null && (
                      <g key={tick.value}>
                        <line
                          x1={tick.coordinate}
                          x2={tick.coordinate}
                          y1={plot.bottom}
                          y2={plot.bottom + TICK_SIZE}
                          stroke={chart.axis}
                        />
                        <text
                          x={tick.labelX}
                          y={plot.bottom + TICK_SIZE + TICK_MARGIN}
                          dy="0.71em"
                          textAnchor="middle"
                          fill={chart.axis}
                          fontSize={xAxis.tickFontSize}
                        >
                          {tick.label}
                        </text>
                      </g>
                    )
                )}
                {xAxis.label && (
                  <text
                    x={(plot.left + plot.right) / 2}
                    y={plot.bottom + X_AXIS_HEIGHT + LABEL_OFFSET}
                    textAnchor="middle"
                    fill={chart.label}
                    fontWeight={600}
                    fontSize={xAxis.labelFontSize}
                  >
                    {xAxis.label}
                  </text>
                )}
              </g>

              {axes.map((axis) => (
                <YAxis
                  key={axis.id}
                  axis={axis}
                  scale={yScales[axis.id]}
                  ticks={yResolved[axis.id].ticks}
                  plot={plot}
                  chart={chart}
                  height={height}
                />
              ))}

              <g>
                {paths.map((p) => (
                  <SeriesLine
                    key={p.key}
                    d={p.d}
                    color={p.color}
                    strokeWidth={strokeWidth}
                    dots={p.dots}
                    dotRadius={dotRadius}
                  />
                ))}
              </g>
            </svg>
            <HoverLayer
              x={x}
              series={plotted}
              xScale={xScale}
              yScales={yScales}
              plot={plot}
              width={width}
              height={height}
              renderTooltip={renderTooltip}
            />
            {exportName && (
              <PlotExportButtons
                getSvg={() => svgRef.current}
                getLegend={
                  hasLegend ? () => exportLegend(legendPayload, legendMaxVisible) : undefined
                }
                fileName={exportName}
                className="absolute z-20"
                style={{ top: plot.top + 4, right: width - plot.right + 4 }}
              />
            )}
          </>
        )}
      </div>
      {hasLegend && (
        <div style={{ paddingTop: legendPaddingTop, paddingBottom: margin.bottom }}>
          {renderLegend(legendPayload)}
        </div>
      )}
    </div>
  )
}

export default LineChart
