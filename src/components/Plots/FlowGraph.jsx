import * as d3 from 'd3'
import { React, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { isRealSpecies, computeGrossProduction } from './flowUtils'

// Edge/arrow color for in-range flux; out-of-range edges are muted to gray instead.
const ARROW_COLOR = '#3D96C3'
const ARROW_MUTED_COLOR = '#6b7280'

// Species node circles: unfilled, outline only
const SPECIES_OUTLINE_COLOR = '#E6807A'

// Reaction node rect fill
const REACTION_NODE_COLOR = '#FFCA07'
const REACTION_NODE_ACTIVE_COLOR = '#E6B606'

// ─── Helpers ────────────────────────────────────────────────────────────────

function reactionLabel(reaction) {
  const fmt = (arr) =>
    arr
      .filter((s) => isRealSpecies(s['species name']))
      .map((s) =>
        s.coefficient === 1 ? s['species name'] : `${s.coefficient}${s['species name']}`
      )
      .join(' + ')
  return `${fmt(reaction.reactants)} → ${fmt(reaction.products)}`
}

/**
 * Measure text width using a temporary SVG text element.
 * Used to size reaction rect nodes to fit their label.
 */
function measureText(text, fontSize = 10) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.style.visibility = 'hidden'
  svg.style.position = 'absolute'
  document.body.appendChild(svg)
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  t.style.fontSize = `${fontSize}px`
  t.textContent = text
  svg.appendChild(t)
  const width = t.getBBox().width
  document.body.removeChild(svg)
  return width
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FlowGraph({ selectedSpecies, fluxRange, timeRange, valueDisplay = 'absolute' }) {
  const ref = useRef()
  const tooltipRef = useRef()
  const [selectedNode, setSelectedNode] = useState(null)

  const reactions = useSelector((state) => state.mechanism.reactions)
  const results = useSelector((state) => state.simulation.excludedResults)

  useEffect(() => {
    if (!selectedSpecies || selectedSpecies.length === 0) return
    if (!reactions || reactions.length === 0) return

    // ── 1. Filter visible reactions ───────────────────────────────────
    const visibleReactions = reactions.filter((rxn) => {
      const realReactants = rxn.reactants
        ? rxn.reactants.map((r) => r['species name']).filter(isRealSpecies)
        : []
      return realReactants.length > 0 && realReactants.every((sp) => selectedSpecies.includes(sp))
    })

    if (visibleReactions.length === 0) return

    // ── 2. Compute flux per reaction ──────────────────────────────────
    const timeStart = timeRange?.start ?? 0
    const timeEnd = timeRange?.end ?? Infinity

    const fluxMap = {}
    for (const rxn of visibleReactions) {
      fluxMap[rxn.name] = computeGrossProduction(rxn, results, timeStart, timeEnd)
    }

    // ── 3. Build reaction nodes ─────────────────────────────────────────
    const FONT_SIZE = 10
    const PAD_X = 12 // horizontal padding inside rect
    const PAD_Y = 10 // vertical padding inside rect
    const NODE_RX = 8
    const SPECIES_R = 24 // base circle radius — grows with text

    const reactionNodes = visibleReactions.map((rxn) => {
      const label = reactionLabel(rxn)
      const textWidth = measureText(label, FONT_SIZE)
      const w = textWidth + PAD_X * 2
      const h = FONT_SIZE + PAD_Y * 2
      return {
        id: rxn.name,
        kind: 'reaction',
        label,
        flux: fluxMap[rxn.name],
        w,
        h,
        // half-extents used for edge clipping
        hw: w / 2,
        hh: h / 2,
      }
    })

    // ── 4. Collect unique real species involved in visible reactions ───
    const speciesSet = new Set()
    for (const rxn of visibleReactions) {
      rxn.reactants.forEach((r) => {
        if (isRealSpecies(r['species name'])) speciesSet.add(r['species name'])
      })
      rxn.products.forEach((p) => {
        if (isRealSpecies(p['species name'])) speciesSet.add(p['species name'])
      })
    }

    const speciesNodes = [...speciesSet].map((sp) => {
      const textWidth = measureText(sp, FONT_SIZE)
      const r = Math.max(SPECIES_R, textWidth / 2 + 10)
      return { id: sp, kind: 'species', label: sp, r }
    })

    // ── 5. Shared SVG scaffolding (defs / markers) ──────────────────────
    const svg = d3.select(ref.current)
    svg.selectAll('defs').remove()
    const defs = svg.append('svg:defs')

    ;['arrow', 'arrow-muted'].forEach((id) => {
      defs
        .append('svg:marker')
        .attr('id', id)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 2)
        .attr('markerHeight', 2)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('fill', id === 'arrow' ? ARROW_COLOR : ARROW_MUTED_COLOR)
        .attr('d', 'M0,-5L10,0L0,5')
    })

    const g = svg.select('g.graph')
    g.selectAll('*').remove()

    const tooltip = d3.select(tooltipRef.current)

    const width = 900
    const height = 600
    svg.attr('viewBox', [0, 0, width, height])

    const nodes = [...reactionNodes, ...speciesNodes]
    const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))

    // ── Build edges: reaction → product-species, species → reaction ────
    //   Each edge carries the flux of the reaction it belongs to.
    //   Deduplicate same source→target pairs: keep the one with highest flux
    //   so stacked overlapping lines don't make arrows look artificially thick.
    const linkMap = new Map() // key: "sourceId||targetId"

    const upsertLink = (sourceId, targetId, flux) => {
      const key = `${sourceId}||${targetId}`
      const existing = linkMap.get(key)
      if (!existing || flux > existing.flux) {
        linkMap.set(key, { source: sourceId, target: targetId, flux })
      }
    }

    for (const rxn of visibleReactions) {
      const flux = fluxMap[rxn.name]

      // reactant species → reaction
      rxn.reactants
        .filter((r) => isRealSpecies(r['species name']))
        .forEach((r) => upsertLink(r['species name'], rxn.name, flux))

      // reaction → product species
      rxn.products
        .filter((p) => isRealSpecies(p['species name']))
        .forEach((p) => upsertLink(rxn.name, p['species name'], flux))
    }

    const links = [...linkMap.values()]

    // ── Relative share per edge ──────────────────────────────────────────
    //   species → reaction edges: % of that species' total consumption
    //   reaction → species edges: % of that species' total production
    const consumptionTotalBySpecies = new Map()
    const productionTotalBySpecies = new Map()
    links.forEach((l) => {
      if (nodeById[l.source]?.kind === 'species') {
        consumptionTotalBySpecies.set(l.source, (consumptionTotalBySpecies.get(l.source) ?? 0) + l.flux)
      }
      if (nodeById[l.target]?.kind === 'species') {
        productionTotalBySpecies.set(l.target, (productionTotalBySpecies.get(l.target) ?? 0) + l.flux)
      }
    })
    links.forEach((l) => {
      if (nodeById[l.source]?.kind === 'species') {
        const total = consumptionTotalBySpecies.get(l.source) ?? 0
        l.percent = total > 0 ? (l.flux / total) * 100 : 0
      } else {
        const total = productionTotalBySpecies.get(l.target) ?? 0
        l.percent = total > 0 ? (l.flux / total) * 100 : 0
      }
    })

    // ── Force simulation ────────────────────────────────────────────────
    const sim = d3
      .forceSimulation(nodes)
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(-600))
      .force(
        'collision',
        d3.forceCollide((d) => (d.kind === 'species' ? d.r + 10 : Math.max(d.hw, d.hh) + 20))
      )
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(160)
      )

    // ── Clip edge endpoints to node boundaries ──────────────────────────
    /**
     * Given a line from (x1,y1) to (x2,y2), return the point on the
     * boundary of the TARGET node that the arrow should end at.
     * For reaction rects: clip to rectangle edge.
     * For species circles: clip to circle perimeter.
     */
    function clipToTarget(sx, sy, tx, ty, targetNode) {
      const dx = tx - sx
      const dy = ty - sy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) return { x: tx, y: ty }
      const ux = dx / dist
      const uy = dy / dist

      if (targetNode.kind === 'species') {
        return {
          x: tx - ux * targetNode.r,
          y: ty - uy * targetNode.r,
        }
      }
      // Reaction rect: find intersection with rectangle border
      const hw = targetNode.hw
      const hh = targetNode.hh
      // Scale factor to hit the rect edge
      const scaleX = ux !== 0 ? hw / Math.abs(ux) : Infinity
      const scaleY = uy !== 0 ? hh / Math.abs(uy) : Infinity
      const scale = Math.min(scaleX, scaleY)
      return {
        x: tx - ux * scale,
        y: ty - uy * scale,
      }
    }

    function clipToSource(sx, sy, tx, ty, sourceNode) {
      const dx = tx - sx
      const dy = ty - sy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist === 0) return { x: sx, y: sy }
      const ux = dx / dist
      const uy = dy / dist

      if (sourceNode.kind === 'species') {
        return {
          x: sx + ux * sourceNode.r,
          y: sy + uy * sourceNode.r,
        }
      }
      const hw = sourceNode.hw
      const hh = sourceNode.hh
      const scaleX = ux !== 0 ? hw / Math.abs(ux) : Infinity
      const scaleY = uy !== 0 ? hh / Math.abs(uy) : Infinity
      const scale = Math.min(scaleX, scaleY)
      return {
        x: sx + ux * scale,
        y: sy + uy * scale,
      }
    }

    // ── Edges ────────────────────────────────────────────────────────────
    const link = g
      .selectAll('line.edge')
      .data(links)
      .join('line')
      .attr('class', 'edge')
      .style('stroke', ARROW_COLOR)
      .style('stroke-width', 1)
      .style('cursor', 'pointer')
      .attr('marker-end', 'url(#arrow)')
      .on('mousemove', (event, d) => {
        tooltip
          .style('display', 'block')
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 28}px`)
          .html(
            valueDisplay === 'relative'
              ? `<div>${d.percent.toFixed(1)}%</div>`
              : `<div>${(d.flux ?? 0).toExponential(3)} mol m-3</div>`
          )
      })
      .on('mouseleave', () => tooltip.style('display', 'none'))

    // ── Species nodes (circles) ──────────────────────────────────────────
    const speciesGroup = g
      .selectAll('g.species-node')
      .data(speciesNodes)
      .join('g')
      .attr('class', 'species-node')
      .style('cursor', 'grab')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    speciesGroup
      .append('circle')
      .attr('r', (d) => d.r)
      .style('fill', 'none')
      .style('stroke', SPECIES_OUTLINE_COLOR)
      .style('stroke-width', 4)
      .style('pointer-events', 'all')

    speciesGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${FONT_SIZE}px`)
      .style('font-weight', 'bold')
      .style('fill', '#1f2937')
      .style('pointer-events', 'none')
      .text((d) => d.label)

    // ── Reaction nodes (rounded rects) ───────────────────────────────────
    const nodeGroup = g
      .selectAll('g.reaction-node')
      .data(reactionNodes)
      .join('g')
      .attr('class', 'reaction-node')
      .style('cursor', 'grab')
      .call(
        d3
          .drag()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode((prev) => (prev === d.id ? null : d.id))
      })

    // Rect background
    nodeGroup
      .append('rect')
      .attr('width', (d) => d.w)
      .attr('height', (d) => d.h)
      .attr('rx', NODE_RX)
      .attr('x', (d) => -d.hw)
      .attr('y', (d) => -d.hh)
      .style('fill', REACTION_NODE_COLOR)
      .style('stroke', 'none')

    // Reaction label centered in rect
    nodeGroup
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${FONT_SIZE}px`)
      .style('fill', '#1f2937')
      .style('pointer-events', 'none')
      .text((d) => d.label)

    // Gross production label shown below rect on click/select
    const fluxLabel = nodeGroup
      .append('text')
      .attr('class', 'flux-label')
      .attr('text-anchor', 'middle')
      .attr('y', (d) => d.hh + 14)
      .style('font-size', `${FONT_SIZE}px`)
      .style('fill', '#046b5b')
      .style('opacity', 0)
      .style('pointer-events', 'none')

    fluxLabel
      .append('tspan')
      .attr('x', 0)
      .attr('dy', 0)
      .text((d) => `${d.flux.toExponential(3)} mol m⁻³`)

    svg.on('click', () => setSelectedNode(null))

    // ── Tick ──────────────────────────────────────────────────────────────
    sim.on('tick', () => {
      link.each(function (d) {
        const sNode = nodeById[typeof d.source === 'object' ? d.source.id : d.source]
        const tNode = nodeById[typeof d.target === 'object' ? d.target.id : d.target]
        if (!sNode || !tNode) return

        const sx = d.source.x ?? 0
        const sy = d.source.y ?? 0
        const tx = d.target.x ?? 0
        const ty = d.target.y ?? 0

        const srcPt = clipToSource(sx, sy, tx, ty, sNode)
        const tgtPt = clipToTarget(sx, sy, tx, ty, tNode)

        d3.select(this)
          .attr('x1', srcPt.x)
          .attr('y1', srcPt.y)
          .attr('x2', tgtPt.x)
          .attr('y2', tgtPt.y)
      })

      speciesGroup.attr('transform', (d) => `translate(${d.x},${d.y})`)
      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`)
    })

    // ── Zoom ────────────────────────────────────────────────────────────
    const zoom = d3
      .zoom()
      .scaleExtent([0.05, 4])
      .on('zoom', ({ transform }) => g.attr('transform', transform))
    svg.call(zoom)

    sim.alpha(0.4).restart()
    return () => sim.stop()
  }, [selectedSpecies, fluxRange, timeRange, reactions, results, valueDisplay])

  // Sync selectedNode → D3 flux label visibility & rect highlight
  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('g.reaction-node').each(function (d) {
      const isActive = d && d.id === selectedNode
      d3.select(this)
        .select('text.flux-label')
        .style('opacity', isActive ? 1 : 0)
      d3.select(this)
        .select('rect')
        .style('fill', isActive ? REACTION_NODE_ACTIVE_COLOR : REACTION_NODE_COLOR)
    })
  }, [selectedNode])

  // Re-applies edge stroke width & color whenever fluxRange changes
  // without rebuilding the whole simulation.
  useEffect(() => {
    const isMuted = (flux) => flux < fluxRange.start || flux > fluxRange.end

    const edgeStrokeWidth = (flux) => {
      const BASE = 2
      const f = flux ?? 0
      if (f < fluxRange.start) return BASE
      if (f > fluxRange.end) return fluxRange.maxArrowWidth + BASE
      if (fluxRange.isLogScale) {
        const lo = Math.log(Math.max(fluxRange.start, 1e-30))
        const hi = Math.log(Math.max(fluxRange.end, 1e-30))
        if (hi === lo) return BASE
        return ((Math.log(f) - lo) / (hi - lo)) * fluxRange.maxArrowWidth + BASE
      }
      const range = fluxRange.end - fluxRange.start
      if (range === 0) return BASE
      return ((f - fluxRange.start) / range) * fluxRange.maxArrowWidth + BASE
    }

    d3.select(ref.current)
      .selectAll('.edge')
      .style('stroke', (d) => (isMuted(d.flux) ? ARROW_MUTED_COLOR : ARROW_COLOR))
      .style('stroke-width', (d) => edgeStrokeWidth(d.flux))
      .attr('marker-end', (d) => (isMuted(d.flux) ? 'url(#arrow-muted)' : 'url(#arrow)'))
  }, [fluxRange])

  if (!selectedSpecies || selectedSpecies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">
        Select species in the panel to view reaction nodes
      </div>
    )
  }
  if (!reactions || reactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-lg">
        No reactions found in mechanism
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={ref} className="w-full h-full">
        <g className="graph" />
      </svg>
      {/* Edge hover tooltip */}
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          color: '#6b7280',
          fontSize: '15px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      />
    </div>
  )
}
