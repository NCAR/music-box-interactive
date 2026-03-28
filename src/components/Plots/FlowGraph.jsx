import * as d3 from "d3";
import { React, useEffect, useRef } from 'react'

const MOCK_SPECIES = ["H2O", "M", "N2", "O", "O1D", "O2", "O3"];

const MOCK_REACTIONS = [
    { source: "O",   target: "O3",  flux: 0.85,  name: "O + O2 + M -> O3 + M",   className: "flux" },
    { source: "O3",  target: "O",   flux: 0.60,  name: "O3 -> O + O2",            className: "flux" },
    { source: "O3",  target: "O1D", flux: 0.45,  name: "O3 -> O1D + O2",          className: "flux" },
    { source: "O1D", target: "O",   flux: 0.30,  name: "O1D + N2 -> O + N2",      className: "flux" },
    { source: "O1D", target: "O2",  flux: 0.20,  name: "O1D + O2 -> O + O2",      className: "flux" },
    { source: "O2",  target: "O",   flux: 0.90,  name: "O2 -> 2O",                className: "flux" },
    { source: "O",   target: "O2",  flux: 0.55,  name: "O + O3 -> 2O2",           className: "flux" },
    { source: "N2",  target: "O1D", flux: 0.10,  name: "O1D + N2 -> O + N2",      className: "flux" },
    { source: "O2",  target: "O3",  flux: 0.40,  name: "O + O2 + M -> O3 + M",    className: "flux" },
    { source: "H2O", target: "O1D", flux: 0.05,  name: "O1D + H2O -> 2OH",        className: "flux" },
    { source: "M",   target: "O3",  flux: 0.15,  name: "O + O2 + M -> O3 + M",    className: "flux" },
];

export function FlowGraph({ selectedSpecies, fluxRange }) {
    const ref = useRef();

    useEffect(() => {
        if (!selectedSpecies || selectedSpecies.length === 0) return;

        const width = 900;
        const height = 800;

        const svg = d3
            .select(ref.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        // Filter nodes and links based on selected species
        const nodes = selectedSpecies.map((id) => ({ id, name: id, className: "node" }));
        const links = MOCK_REACTIONS.filter(
            (r) => selectedSpecies.includes(r.source) && selectedSpecies.includes(r.target)
        ).map((r) => ({ ...r }));

        // Arrow markers
        svg.selectAll("defs").remove();
        svg.append("svg:defs")
            .selectAll("marker")
            .data(["arrow", "arrow-muted"])
            .enter()
            .append("svg:marker")
            .attr("id", String)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 23)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("fill", (d) => d === "arrow" ? "#2dd4bf" : "#aaa")
            .attr("d", "M0,-5L10,0L0,5");

        const g = svg.select("g.graph");
        g.selectAll("*").remove();

        const simulation = d3
            .forceSimulation(nodes)
            .force("x", d3.forceX(width / 2))
            .force("y", d3.forceY(height / 2))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide(40))
            .force("link", d3.forceLink().id((d) => d.id).links(links));

        const isMuted = (d) =>
            d.flux < fluxRange.start || d.flux > fluxRange.end;

        const strokeWidth = (d) => {
            if (d.flux < fluxRange.start) return 0.5;
            if (d.flux > fluxRange.end) return fluxRange.maxArrowWidth + 0.5;
            if (fluxRange.isLogScale) {
                return (
                    ((Math.log(d.flux) - Math.log(fluxRange.start)) /
                        (Math.log(fluxRange.end) - Math.log(fluxRange.start))) *
                    fluxRange.maxArrowWidth + 0.5
                );
            }
            return (
                ((d.flux - fluxRange.start) / (fluxRange.end - fluxRange.start)) *
                fluxRange.maxArrowWidth + 0.5
            );
        };

        // Tooltip
        const tooltipGroup = svg.select("g.info");
        tooltipGroup.selectAll("*").remove();
        tooltipGroup.style("opacity", 0).attr("transform", `translate(5, ${height - 24})`);
        const tooltipText = tooltipGroup.append("text").style("font-size", "12px").style("fill", "#333");

        // Links
        const link = g.selectAll("line.edge").data(links).join("line")
            .style("stroke", (d) => isMuted(d) ? "#aaa" : "#2dd4bf")
            .style("stroke-width", strokeWidth);

        const linkArrow = g.selectAll("line.arrow").data(links).join("line")
            .style("stroke", (d) => isMuted(d) ? "#aaa" : "#2dd4bf")
            .attr("marker-end", (d) => isMuted(d) ? "url(#arrow-muted)" : "url(#arrow)");

        g.selectAll("line.tooltip-hit").data(links).join("line")
            .style("stroke", "transparent")
            .style("stroke-width", 10)
            .on("mouseenter", (event, d) => {
                tooltipText.text(`Flux: ${d.flux} mol m-3`);
                tooltipGroup.style("opacity", 1);
            })
            .on("mouseleave", () => tooltipGroup.style("opacity", 0));

        // Reaction label on links
        const linkLabel = g.selectAll("text.link-label").data(links).join("text")
            .attr("class", "link-label")
            .style("font-size", "10px")
            .style("fill", "#555")
            .style("pointer-events", "none")
            .text((d) => d.name);

        // Nodes
        const node = g.selectAll("circle").data(nodes).join("circle")
            .attr("r", 20)
            .style("fill", "#0d9488")
            .style("cursor", "grab")
            .call(
                d3.drag()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x; d.fy = d.y;
                    })
                    .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null; d.fy = null;
                    })
            );

        const nodeLabel = g.selectAll("text.node-label").data(nodes).join("text")
            .attr("class", "node-label")
            .style("font-size", "12px")
            .style("fill", "#333")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "middle")
            .style("pointer-events", "none")
            .text((d) => d.name);

        // Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.01, 3])
            .on("zoom", ({ transform }) => g.attr("transform", transform));
        svg.call(zoom);

        simulation.on("tick", () => {
            const pos = (d, axis) => d[axis];

            [link, linkArrow].forEach((l) => l
                .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y)
            );

            g.selectAll("line.tooltip-hit")
                .attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);

            linkLabel
                .attr("x", (d) => (d.source.x + d.target.x) / 2)
                .attr("y", (d) => (d.source.y + d.target.y) / 2);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            nodeLabel.attr("x", (d) => d.x).attr("y", (d) => d.y);
        });

        simulation.alpha(0.3).restart();
        return () => simulation.stop();
    }, [selectedSpecies, fluxRange]);

    if (!selectedSpecies || selectedSpecies.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-lg">
                To view Flux Graph, select a species
            </div>
        );
    }

    return (
        <svg ref={ref} className="w-full h-full">
            <g className="graph" />
            <g className="info" />
        </svg>
    );
}
