import * as d3 from "d3";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  getNodes,
  getLinks,
  getIsFlowPlotLogScale,
  getFlowMaxArrowWidth,
  getFlowFluxRangeStart,
  getFlowFluxRangeEnd,
} from "../../redux/selectors";
import * as styles from "../../styles/flow_graph.module.css";

function FlowGraph({ nodes, links, fluxRange }) {
  const ref = useRef();
  const toolTipFontSize = 12;

  const [charge, setCharge] = useState(-300);
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);

  // re-create animation every time nodes change
  useEffect(() => {
    const width = 900;
    const height = 800;
    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .attr("class", styles.flow_area)
      .attr("viewBox", [0, 0, width, height]);

    // link formatting
    svg.selectAll("defs").remove();
    svg
      .append("svg:defs")
      .selectAll("marker")
      .data(["arrow", "arrow-muted"])
      .enter()
      .append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 23)
      .attr("refY", 0.0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("class", (d) => (d === "arrow" ? styles.flux : styles.muted))
      .attr("d", "M0,-5L10,0L0,5");

    const g = svg.select("g.graph");
    g.selectAll("*").remove();

    // force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force("x", d3.forceX(width / 2))
      .force("y", d3.forceY(height / 2))
      .force("charge", d3.forceManyBody().strength(charge))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(5))
      .force(
        "link",
        d3
          .forceLink()
          .id((d) => {
            return d.id;
          })
          .links(links),
      );

    const tooltipGroup = svg.select("g.info");
    tooltipGroup.selectAll("*").remove();

    tooltipGroup
      .style("opacity", 0)
      .attr("transform", `translate(5, ${height - 2 * toolTipFontSize})`);

    const tooltipText = tooltipGroup
      .append("text")
      .style("font-size", `${toolTipFontSize}px`)
      .style("dominant-baseline", "hanging");

    const link = g
      .selectAll("line.edge")
      .data(links)
      .join("line")
      .attr("class", (d) => {
        return d.flux < fluxRange.start || d.flux > fluxRange.end
          ? styles["muted"]
          : styles[d.className];
      })
      .style("stroke-width", (d) => {
        if (d.flux < fluxRange.start) return 0.5;
        if (d.flux > fluxRange.end) return fluxRange.maxArrowWidth + 0.5;
        if (fluxRange.isLogScale) {
          return (
            ((Math.log(d.flux) - Math.log(fluxRange.start)) /
              (Math.log(fluxRange.end) - Math.log(fluxRange.start))) *
              fluxRange.maxArrowWidth +
            0.5
          );
        } else {
          return (
            ((d.flux - fluxRange.start) / (fluxRange.end - fluxRange.start)) *
              fluxRange.maxArrowWidth +
            0.5
          );
        }
      });

    const linkArrow = g
      .selectAll("line.arrow")
      .data(links)
      .join("line")
      .attr("class", (d) => {
        return d.flux < fluxRange.start || d.flux > fluxRange.end
          ? styles["muted"]
          : styles[d.className];
      })
      .attr("marker-end", (d) => {
        return d.flux < fluxRange.start || d.flux > fluxRange.end
          ? "url(#arrow-muted)"
          : "url(#arrow)";
      });

    const linkToolTip = g
      .selectAll("line.tooltip")
      .data(links)
      .join("line")
      .attr("class", (d) => {
        return styles["link-tooltip"];
      })
      .on("mouseenter", (event, d) => {
        tooltipText.text(`Flux: ${d.flux} mol m-3`);
        tooltipGroup.style("opacity", 1);
      })
      .on("mouseleave", () => {
        tooltipGroup.style("opacity", 0);
      })
      .style("stroke-width", 10)
      .style("stroke", "white")
      .style("opacity", 0);
    linkToolTip.append("title").text((d) => {
      return `Flux: ${d.flux} mol m-3`;
    });

    const node = g
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("class", (d) => {
        return styles[d.className];
      })
      .call(
        d3
          .drag()
          .on("start", (d) => {
            if (!d.avtive) simulation.alphaTarget(0.3).restart();
            d.subject.fx = d.subject.x;
            d.subject.fy = d.subject.y;
          })
          .on("drag", (d) => {
            d.subject.fx = d.x;
            d.subject.fy = d.y;
          })
          .on("end", (d) => {
            if (!d.active) simulation.alphaTarget(0);
            d.subject.fx = null;
            d.subject.fy = null;
          }),
      );

    node.append("title").text((d) => {
      return d.name;
    });

    const text = g.selectAll("g").data(nodes).join("g");

    text
      .append("svg:text")
      .text((d) => {
        return d.name;
      })
      .style("font-size", `4px`)
      .attr("font-family", "sans-serif");

    const zoom = d3
      .zoom()
      .scaleExtent([0.0001, 3])
      .on("zoom", ({ transform }) => {
        g.attr("transform", transform);
        setZoomTransform(transform);
      });

    svg.call(zoom).call(zoom.transform, zoomTransform);

    // update state on every frame
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => {
          return d.source.x;
        })
        .attr("y1", (d) => {
          return d.source.y;
        })
        .attr("x2", (d) => {
          return d.target.x;
        })
        .attr("y2", (d) => {
          return d.target.y;
        });

      linkArrow
        .attr("x1", (d) => {
          return d.source.x;
        })
        .attr("y1", (d) => {
          return d.source.y;
        })
        .attr("x2", (d) => {
          return d.target.x;
        })
        .attr("y2", (d) => {
          return d.target.y;
        });

      linkToolTip
        .attr("x1", (d) => {
          return d.source.x;
        })
        .attr("y1", (d) => {
          return d.source.y;
        })
        .attr("x2", (d) => {
          return d.target.x;
        })
        .attr("y2", (d) => {
          return d.target.y;
        });

      node
        .attr("cx", (d) => {
          return d.x;
        })
        .attr("cy", (d) => {
          return d.y;
        });
      text
        .selectAll("text")
        .attr("x", (d) => {
          return d.x;
        })
        .attr("y", (d) => {
          return d.y;
        });
    });

    // slow down with a small alpha
    simulation.alpha(0.3).restart();

    // stop simulation on unmount
    return () => simulation.stop();
  }, [nodes, links, fluxRange, charge]);

  return (
    <svg id="flow-diagram" ref={ref}>
      <g class="graph" />
      <g class="info" />
    </svg>
  );
}

const mapStateToProps = (state) => {
  let links = getLinks(state);
  return {
    nodes: getNodes(state),
    links: links,
    fluxRange: {
      start: getFlowFluxRangeStart(state),
      end: getFlowFluxRangeEnd(state),
      isLogScale: getIsFlowPlotLogScale(state),
      maxArrowWidth: getFlowMaxArrowWidth(state),
    },
  };
};

export default connect(mapStateToProps)(FlowGraph);
