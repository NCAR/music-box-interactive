import * as d3 from "d3";
import { React, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * MUSICA products contain internal tracking species with __ in their name
 * (e.g. "O1D__N2__O__N2"). Filter these out so they don't appear in labels
 * or drive edges between reaction nodes.
 */
const isRealSpecies = (name) => !name.includes('__');

/**
 * Build a human-readable label for a reaction from its reactants/products arrays.
 * Coefficient of 1 is omitted; coefficient > 1 is prepended (e.g. "2O2").
 * Internal MUSICA tracking species (containing "__") are excluded from the label.
 */
function reactionLabel(reaction) {
    const fmt = (arr) =>
        arr
            .filter((s) => isRealSpecies(s['species name']))
            .map((s) => (s.coefficient === 1 ? s['species name'] : `${s.coefficient}${s['species name']}`))
            .join(' + ');
    return `${fmt(reaction.reactants)} → ${fmt(reaction.products)}`;
}

/**
 * Compute flux for a reaction over [timeStart, timeEnd].
 * Flux = sum over all time steps in range of (sum of reactant concentrations at that step).
 * Results is an array of { time: number, concentrations: { "CONC.X.mol m-3": number, ... } }
 */
function computeFlux(reaction, results, timeStart, timeEnd) {
    console.log(`Computing flux for ${reaction.name} over [${timeStart}, ${timeEnd}]`);

    if (!Array.isArray(results)) {
        console.warn(`Results is not an array for ${reaction.name}`);
        return 0;
    }

    // Derive the concentration key the same way addProductsToReactions does
    const prodName = reaction.name
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_]/g, '')
        .toUpperCase();
    const concKey = `CONC.${prodName}.mol m-3`;

    let total = 0;
    for (const timeEntry of results) {
        const t = timeEntry.time;
        if (t < timeStart || t > timeEnd) continue;

        const concentrations = timeEntry.concentrations;
        if (!concentrations) continue;

        if (concKey in concentrations) {
            total += concentrations[concKey] ?? 0;
        }
    }

    return total;
}

/**
 * Given all reactions, build directed edges between reaction nodes.
 * An edge A → B exists when:
 *   - A real-species product of reaction A is a real-species reactant of reaction B
 *   - A !== B
 * Returns an array of { source: reactionName, target: reactionName, sharedSpecies: name }
 */
function buildEdges(reactions) {
    const edges = [];
    for (let i = 0; i < reactions.length; i++) {
        const a = reactions[i];
        const aProducts = new Set(
            a.products.map((p) => p['species name']).filter(isRealSpecies)
        );
        for (let j = 0; j < reactions.length; j++) {
            if (i === j) continue;
            const b = reactions[j];
            const bReactants = b.reactants
                .map((r) => r['species name'])
                .filter(isRealSpecies);
            for (const sp of bReactants) {
                if (aProducts.has(sp)) {
                    edges.push({
                        source: a.name,
                        target: b.name,
                        sharedSpecies: sp,
                    });
                }
            }
        }
    }
    return edges;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FlowGraph({ selectedSpecies, fluxRange, timeRange }) {
    const ref = useRef();
    const [selectedNode, setSelectedNode] = useState(null);

    // Pull reactions and results from Redux
    const reactions = useSelector((state) => state.mechanism.reactions);
    const results   = useSelector((state) => state.simulation.excludedResults);
    // console.log('FlowGraph results: ', results);

    useEffect(() => {
        if (!selectedSpecies || selectedSpecies.length === 0) return;
        if (!reactions || reactions.length === 0) return;

        // ── 1. Filter visible reaction nodes ──────────────────────────────
        // A reaction is visible only when ALL of its real reactants are selected
        const visibleReactions = reactions.filter((rxn) => {
            const realReactants = rxn.reactants ? (
                rxn.reactants
                .map((r) => r['species name'])
                .filter(isRealSpecies)
            ) : [];
            return realReactants.length > 0 && realReactants.every((sp) => selectedSpecies.includes(sp));
        });

        if (visibleReactions.length === 0) return;

        // ── 2. Compute flux per reaction ──────────────────────────────────
        const timeStart = timeRange?.start ?? 0;
        const timeEnd   = timeRange?.end ?? Infinity;

        const fluxMap = {};
        for (const rxn of visibleReactions) {
            fluxMap[rxn.name] = computeFlux(rxn, results, timeStart, timeEnd);
        }

        // ── 3. Build nodes ────────────────────────────────────────────────
        const nodes = visibleReactions.map((rxn) => ({
            id:    rxn.name,
            label: reactionLabel(rxn),
            flux:  fluxMap[rxn.name],
        }));

        // ── 4. Build directed edges (only between visible reactions) ──────
        const visibleNames = new Set(visibleReactions.map((r) => r.name));
        const allEdges = buildEdges(visibleReactions);
        const links = allEdges.filter(
            (e) => visibleNames.has(e.source) && visibleNames.has(e.target)
        );

        // ── 5. D3 setup ───────────────────────────────────────────────────
        const width  = 900;
        const height = 800;
        const NODE_W = 140;
        const NODE_H = 36;
        const NODE_RX = 8;

        const svg = d3
            .select(ref.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        // Arrow markers
        svg.selectAll("defs").remove();
        const defs = svg.append("svg:defs");

        ["arrow", "arrow-muted"].forEach((id) => {
            defs.append("svg:marker")
                .attr("id", id)
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 10)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("svg:path")
                .attr("fill", id === "arrow" ? "#2dd4bf" : "#6b7280")
                .attr("d", "M0,-5L10,0L0,5");
        });

        const g = svg.select("g.graph");
        g.selectAll("*").remove();

        // ── 6. Force simulation ───────────────────────────────────────────
        const sim = d3
            .forceSimulation(nodes)
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("collision", d3.forceCollide(90))
            .force(
                "link",
                d3.forceLink(links)
                    .id((d) => d.id)
                    .distance(200)
            );

        // ── 7. Flux styling helpers ───────────────────────────────────────
        const isMuted = (d) =>
            d.flux < fluxRange.start || d.flux > fluxRange.end;

        const edgeStrokeWidth = (d) => {
            const f = d.flux ?? 0;
            if (f < fluxRange.start) return 0.5;
            if (f > fluxRange.end)   return fluxRange.maxArrowWidth + 0.5;
            if (fluxRange.isLogScale) {
                const lo = Math.log(Math.max(fluxRange.start, 1e-30));
                const hi = Math.log(Math.max(fluxRange.end,   1e-30));
                if (hi === lo) return 0.5;
                return ((Math.log(f) - lo) / (hi - lo)) * fluxRange.maxArrowWidth + 0.5;
            }
            const range = fluxRange.end - fluxRange.start;
            if (range === 0) return 0.5;
            return ((f - fluxRange.start) / range) * fluxRange.maxArrowWidth + 0.5;
        };

        // ── 8. Edges ──────────────────────────────────────────────────────
        // Attach flux to each link from its source node's flux value
        const nodeFluxById = Object.fromEntries(nodes.map((n) => [n.id, n.flux]));
        links.forEach((l) => {
            l.flux = nodeFluxById[typeof l.source === 'object' ? l.source.id : l.source] ?? 0;
        });

        const link = g.selectAll("line.edge")
            .data(links)
            .join("line")
            .attr("class", "edge")
            .style("stroke", (d) => isMuted(d) ? "#6b7280" : "#2dd4bf")
            .style("stroke-width", edgeStrokeWidth)
            .attr("marker-end", (d) => isMuted(d) ? "url(#arrow-muted)" : "url(#arrow)");

        // Shared species label on edge midpoint
        const edgeLabel = g.selectAll("text.edge-label")
            .data(links)
            .join("text")
            .attr("class", "edge-label")
            .style("font-size", "10px")
            .style("fill", "#9ca3af")
            .style("text-anchor", "middle")
            .style("pointer-events", "none")
            .text((d) => d.sharedSpecies);

        // ── 9. Reaction nodes (rounded rects + label) ─────────────────────
        const nodeGroup = g.selectAll("g.reaction-node")
            .data(nodes)
            .join("g")
            .attr("class", "reaction-node")
            .style("cursor", "grab")
            .call(
                d3.drag()
                    .on("start", (event, d) => {
                        if (!event.active) sim.alphaTarget(0.3).restart();
                        d.fx = d.x; d.fy = d.y;
                    })
                    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on("end", (event, d) => {
                        if (!event.active) sim.alphaTarget(0);
                        d.fx = null; d.fy = null;
                    })
            )
            .on("click", (event, d) => {
                event.stopPropagation();
                setSelectedNode((prev) => (prev === d.id ? null : d.id));
            });

        // Node background rect
        nodeGroup.append("rect")
            .attr("width", NODE_W)
            .attr("height", NODE_H)
            .attr("rx", NODE_RX)
            .attr("x", -NODE_W / 2)
            .attr("y", -NODE_H / 2)
            .style("fill", "#0d9488")
            .style("stroke", "#99f6e4")
            .style("stroke-width", 0.5);

        // Reaction equation label (centred inside rect)
        nodeGroup.append("text")
            .attr("class", "node-label")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .style("fill", "#f0fdf4")
            .style("pointer-events", "none")
            .text((d) => d.label);

        // Flux value text — shown below node only when this node is selected
        // We use a React-controlled approach: update visibility after each render
        nodeGroup.append("text")
            .attr("class", "flux-label")
            .attr("text-anchor", "middle")
            .attr("y", NODE_H / 2 + 14)
            .style("font-size", "10px")
            .style("fill", "#5eead4")
            .style("pointer-events", "none")
            .text((d) => `Flux: ${d.flux.toExponential(3)} mol m⁻³`);

        // Deselect when clicking blank SVG area
        svg.on("click", () => setSelectedNode(null));

        // ── 10. Tick ──────────────────────────────────────────────────────
        sim.on("tick", () => {
            link
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            edgeLabel
                .attr("x", (d) => (d.source.x + d.target.x) / 2)
                .attr("y", (d) => (d.source.y + d.target.y) / 2 - 5);

            nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        // Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.05, 4])
            .on("zoom", ({ transform }) => g.attr("transform", transform));
        svg.call(zoom);

        sim.alpha(0.4).restart();
        return () => sim.stop();

    }, [selectedSpecies, fluxRange, timeRange, reactions, results]);

    // Sync selectedNode state → D3 flux label visibility
    // Runs after every render (selectedNode change) without rebuilding the simulation
    useEffect(() => {
        const svg = d3.select(ref.current);
        svg.selectAll("g.reaction-node").each(function (d) {
            const isActive = d && d.id === selectedNode;
            d3.select(this)
                .select("text.flux-label")
                .style("opacity", isActive ? 1 : 0);

            d3.select(this)
                .select("rect")
                .style("fill",   isActive ? "#0f766e" : "#0d9488")
                .style("stroke", isActive ? "#2dd4bf" : "#99f6e4")
                .style("stroke-width", isActive ? 1.5 : 0.5);
        });
    }, [selectedNode]);

    if (!selectedSpecies || selectedSpecies.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">
                Select species in the panel to view reaction nodes
            </div>
        );
    }

    if (!reactions || reactions.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">
                No reactions found in mechanism
            </div>
        );
    }

    return (
        <svg ref={ref} className="w-full h-full">
            <g className="graph" />
        </svg>
    );
}
