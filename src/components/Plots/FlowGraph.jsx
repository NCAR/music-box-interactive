import * as d3 from 'd3'
import { React, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  isRealSpecies,
  computeIntegratedReactionRate,
  getReactionEdges,
  getThirdBodyNames,
  isReactionVisible,
  matchesReactionType,
  reactionProducts,
  reactionReactants,
} from './flowUtils'
import { getReactionTypeLabel } from '../Mechanism/reactions/reactionRegistry'

// Edge/arrow color for in-range rate; out-of-range edges are muted to gray instead.
const ARROW_COLOR = '#3D96C3'
const ARROW_MUTED_COLOR = '#6b7280'

// Species node circles: unfilled, outline only
const SPECIES_OUTLINE_COLOR = '#E6807A'

// Reaction node rect fill
const REACTION_NODE_COLOR = '#FFCA07'
const REACTION_NODE_ACTIVE_COLOR = '#E6B606'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Reaction names are not unique: ts1 and carbon_bond_5 contain distinct reactions
// with the same reactants/products, causing name collisions. Identify nodes by the
// reaction's own id to avoid merging them and reporting only one reaction's rate.
const reactionNodeId = (reaction) => reaction.id ?? reaction.name

// Node labels are reaction formulas, so distinct reactions can share the same label.
// When it happens, they remain separate nodes with independent rates, but colliding labels
// are qualified by reaction type, then numbered if needed.
const buildReactionLabels = (reactions) => {
  const formulaCounts = new Map()
  const typeCounts = new Map()

  for (const reaction of reactions) {
    const formula = reactionLabel(reaction)
    formulaCounts.set(formula, (formulaCounts.get(formula) ?? 0) + 1)
    const typeKey = `${formula}::${reaction.type}`
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1)
  }

  const seen = new Map()
  const labels = new Map()

  for (const reaction of reactions) {
    const formula = reactionLabel(reaction)

    if ((formulaCounts.get(formula) ?? 0) <= 1) {
      labels.set(reactionNodeId(reaction), formula)
      continue
    }

    const typeKey = `${formula}::${reaction.type}`
    const typeLabel = getReactionTypeLabel(reaction.type)

    if ((typeCounts.get(typeKey) ?? 0) <= 1) {
      labels.set(reactionNodeId(reaction), `${formula} (${typeLabel})`)
      continue
    }

    const ordinal = (seen.get(typeKey) ?? 0) + 1
    seen.set(typeKey, ordinal)
    labels.set(reactionNodeId(reaction), `${formula} (${typeLabel} ${ordinal})`)
  }

  return labels
}

// An empty side reads as ∅ rather than blank.
const EMPTY_SIDE = '\u2205'

function reactionLabel(reaction) {
  const fmt = (entries) => {
    const text = entries
      .filter((entry) => isRealSpecies(entry['species name']))
      .map((entry) =>
        entry.coefficient === undefined || entry.coefficient === 1
          ? entry['species name']
          : `${entry.coefficient}${entry['species name']}`
      )
      .join(' + ')

    return text || EMPTY_SIDE
  }

  return `${fmt(reactionReactants(reaction))} → ${fmt(reactionProducts(reaction))}`
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

export function FlowGraph({
  selectedSpecies,
  rateRange,
  timeRange,
  reactionType = '',
  valueDisplay = 'absolute',
}) {
  const ref = useRef()
  const tooltipRef = useRef()
  const [selectedNode, setSelectedNode] = useState(null)

  const reactions = useSelector((state) => state.mechanism.reactions)
  const species = useSelector((state) => state.mechanism.species)
  const results = useSelector((state) => state.simulation.excludedResults)

  useEffect(() => {
    if (!selectedSpecies || selectedSpecies.length === 0) return
    if (!reactions || reactions.length === 0) return

    const thirdBodyNames = getThirdBodyNames(species)

    // Third bodies stay out of the graph itself: they are unchanged by the reaction, so an
    // M node with arrows in and out would imply it is consumed and produced. They remain in
    // the reaction label, which shows the true stoichiometry.
    const isGraphSpecies = (name) => isRealSpecies(name) && !thirdBodyNames.has(name)

    // ── 1. Filter visible reactions ───────────────────────────────────
    const visibleReactions = reactions.filter(
      (rxn) =>
        isReactionVisible(rxn, selectedSpecies, thirdBodyNames) &&
        matchesReactionType(rxn, reactionType)
    )

    if (visibleReactions.length === 0) return

    // ── 2. Compute integrated reaction rate per reaction ───────────────
    const timeStart = timeRange?.start ?? 0
    const timeEnd = timeRange?.end ?? Infinity

    // Walk the unfiltered `reactions` array: tracer keys are index-based, and indices from
    // the filtered `visibleReactions` would point at the wrong reactions' tracers.
    const rateMap = {}
    reactions.forEach((reaction, index) => {
      rateMap[reactionNodeId(reaction)] = computeIntegratedReactionRate(
        reaction,
        index,
        results,
        timeStart,
        timeEnd
      )
    })

    // ── 3. Build reaction nodes ─────────────────────────────────────────
    const FONT_SIZE = 10
    const PAD_X = 12 // horizontal padding inside rect
    const PAD_Y = 10 // vertical padding inside rect
    const NODE_RX = 8
    const SPECIES_R = 24 // base circle radius — grows with text

    const reactionLabels = buildReactionLabels(reactions)

    const reactionNodes = visibleReactions.map((rxn) => {
      const label = reactionLabels.get(reactionNodeId(rxn)) ?? reactionLabel(rxn)
      const textWidth = measureText(label, FONT_SIZE)
      const w = textWidth + PAD_X * 2
      const h = FONT_SIZE + PAD_Y * 2
      return {
        id: reactionNodeId(rxn),
        kind: 'reaction',
        label,
        rate: rateMap[reactionNodeId(rxn)],
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
      reactionReactants(rxn).forEach((r) => {
        if (isGraphSpecies(r['species name'])) speciesSet.add(r['species name'])
      })
      reactionProducts(rxn).forEach((p) => {
        if (isGraphSpecies(p['species name'])) speciesSet.add(p['species name'])
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
    //   Each edge carries `coefficient x rate` -- the flow of that species, not the
    //   reaction's own turnover, which is what the reaction node itself reports.
    //   Deduplicate same source→target pairs: keep the one with highest value
    //   so stacked overlapping lines don't make arrows look artificially thick.
    const linkMap = new Map() // key: "sourceId||targetId"

    const upsertLink = (sourceId, targetId, rate) => {
      const key = `${sourceId}||${targetId}`
      const existing = linkMap.get(key)
      if (!existing || rate > existing.rate) {
        linkMap.set(key, { source: sourceId, target: targetId, rate })
      }
    }

    for (const rxn of visibleReactions) {
      for (const edge of getReactionEdges(
        rxn,
        rateMap[reactionNodeId(rxn)],
        thirdBodyNames,
        reactionNodeId(rxn)
      )) {
        upsertLink(edge.source, edge.target, edge.value)
      }
    }

    const links = [...linkMap.values()]

    // ── Relative share per edge ──────────────────────────────────────────
    //   species → reaction edges: % of that species' total consumption
    //   reaction → species edges: % of that species' total production
    const consumptionTotalBySpecies = new Map()
    const productionTotalBySpecies = new Map()
    links.forEach((l) => {
      if (nodeById[l.source]?.kind === 'species') {
        consumptionTotalBySpecies.set(l.source, (consumptionTotalBySpecies.get(l.source) ?? 0) + l.rate)
      }
      if (nodeById[l.target]?.kind === 'species') {
        productionTotalBySpecies.set(l.target, (productionTotalBySpecies.get(l.target) ?? 0) + l.rate)
      }
    })
    links.forEach((l) => {
      if (nodeById[l.source]?.kind === 'species') {
        const total = consumptionTotalBySpecies.get(l.source) ?? 0
        l.percent = total > 0 ? (l.rate / total) * 100 : 0
      } else {
        const total = productionTotalBySpecies.get(l.target) ?? 0
        l.percent = total > 0 ? (l.rate / total) * 100 : 0
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
              : `<div>${(d.rate ?? 0).toExponential(3)} mol m-3</div>`
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

    // Integrated reaction rate label shown below rect on click/select
    const rateLabel = nodeGroup
      .append('text')
      .attr('class', 'rate-label')
      .attr('text-anchor', 'middle')
      .attr('y', (d) => d.hh + 14)
      .style('font-size', `${FONT_SIZE}px`)
      .style('fill', '#046b5b')
      .style('opacity', 0)
      .style('pointer-events', 'none')

    rateLabel
      .append('tspan')
      .attr('x', 0)
      .attr('dy', 0)
      .text((d) => `${d.rate.toExponential(3)} mol m⁻³`)

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
  }, [selectedSpecies, reactionType, rateRange, timeRange, reactions, species, results, valueDisplay])

  // Sync selectedNode → D3 rate label visibility & rect highlight
  useEffect(() => {
    const svg = d3.select(ref.current)
    svg.selectAll('g.reaction-node').each(function (d) {
      const isActive = d && d.id === selectedNode
      d3.select(this)
        .select('text.rate-label')
        .style('opacity', isActive ? 1 : 0)
      d3.select(this)
        .select('rect')
        .style('fill', isActive ? REACTION_NODE_ACTIVE_COLOR : REACTION_NODE_COLOR)
    })
  }, [selectedNode])

  // Re-applies edge stroke width & color whenever rateRange changes
  // without rebuilding the whole simulation.
  useEffect(() => {
    const isMuted = (rate) => rate < rateRange.start || rate > rateRange.end

    const edgeStrokeWidth = (rate) => {
      const BASE = 2
      const f = rate ?? 0
      if (f < rateRange.start) return BASE
      if (f > rateRange.end) return rateRange.maxArrowWidth + BASE
      if (rateRange.isLogScale) {
        const lo = Math.log(Math.max(rateRange.start, 1e-30))
        const hi = Math.log(Math.max(rateRange.end, 1e-30))
        if (hi === lo) return BASE
        return ((Math.log(f) - lo) / (hi - lo)) * rateRange.maxArrowWidth + BASE
      }
      const range = rateRange.end - rateRange.start
      if (range === 0) return BASE
      return ((f - rateRange.start) / range) * rateRange.maxArrowWidth + BASE
    }

    d3.select(ref.current)
      .selectAll('.edge')
      .style('stroke', (d) => (isMuted(d.rate) ? ARROW_MUTED_COLOR : ARROW_COLOR))
      .style('stroke-width', (d) => edgeStrokeWidth(d.rate))
      .attr('marker-end', (d) => (isMuted(d.rate) ? 'url(#arrow-muted)' : 'url(#arrow)'))
  }, [rateRange])

  if (!selectedSpecies || selectedSpecies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-lg">
        Select species in the panel to view reaction nodes
      </div>
    )
  }
  if (!reactions || reactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-lg">
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
