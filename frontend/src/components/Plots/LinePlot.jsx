import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const LinePlot = ({
  data,
  label,
  units,
  labelFontSize,
  tickFontSize,
  toolTipFontSize,
  height,
  precision,
  setActiveIndex,
  activeIndex,
}) => {
  const svgRef = useRef();
  const tooltipGroupRef = useRef();
  const verticalLineRef = useRef();
  const tooltipTextTimeRef = useRef();
  const tooltipTextValueRef = useRef();
  const dotRef = useRef();
  const xRef = useRef();
  const yRef = useRef();
  const width = height * 1.618; // golden ratio determins width based off of the height
  const marginTop = 30;
  const marginRight = 20;
  const marginBottom = 80;
  const marginLeft = width * 0.15;

  useEffect(() => {
    // x and y scales
    const x = d3
      .scaleLinear()
      .domain([0, 1.02 * d3.max(data, (d) => d.time)])
      .range([marginLeft, width - marginRight]);
    const y = d3
      .scaleLinear()
      .domain([
        0.98 * d3.min(data, (d) => d.value),
        1.02 * d3.max(data, (d) => d.value),
      ])
      .range([height - marginBottom, marginTop]);
    xRef.current = x;
    yRef.current = y;

    // Declare the line generator.
    const lineGenerator = d3
      .line()
      .x((d) => x(d.time))
      .y((d) => y(d.value));

    const svg = d3.select(svgRef.current);
    // remove old elements
    svg.selectAll("g").remove();
    svg.selectAll("path").remove();

    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .style("background", "white")
      .style("border-radius", "8px")
      .style("box-shadow", "0px 0px 10px #c6c6c6")
      .style("pointer-events", "all");

    // Add the x-axis.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .style("font-size", `${tickFontSize}px`)
      .call(
        d3
          .axisBottom(x)
          .ticks(width / 80)
          .tickSizeOuter(0),
      )
      .call((g) =>
        g
          .append("text")
          .attr("x", width / 2)
          .attr("y", 2.5 * tickFontSize)
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .style("font-size", `${labelFontSize}px`)
          .text(`time (s)`),
      );

    // Add the y-axis, remove the domain line, add grid lines and a label.
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .style("font-size", `${tickFontSize}px`)
      .call(
        d3
          .axisLeft(y)
          .ticks(height / 40) // add grid lines
          .tickFormat((value) => value.toExponential(precision)),
      )
      .call((g) => g.select(".domain").remove()) // remove the y axis spine
      .call((g) =>
        g
          .selectAll(".tick line") // set the tick color
          .attr("stroke-opacity", 0.1),
      )
      .call((g) =>
        g
          .selectAll(".tick line")
          .clone() // copy the ticks and stretch them to make horizontal grid lines
          .attr("x2", width - marginLeft - marginRight)
          .attr("stroke-opacity", 0.1),
      )
      .call((g) =>
        g
          .append("text")
          .attr("x", -marginLeft + 5)
          .attr("y", labelFontSize)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .style("font-size", `${labelFontSize}px`)
          .text(`${label} (${units})`),
      );

    // Append a path for the line.
    svg
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", lineGenerator(data));

    // Add the transparent vertical line.
    verticalLineRef.current = svg
      .append("line")
      .attr("class", "vertical-line")
      .style("stroke", "black")
      .style("stroke-width", "1px")
      .style("opacity", 0);

    tooltipGroupRef.current = svg
      .append("g")
      .style("opacity", 0)
      .attr("transform", `translate(5, ${height - 2 * toolTipFontSize})`);

    tooltipTextTimeRef.current = tooltipGroupRef.current
      .append("text")
      .style("font-size", `${toolTipFontSize}px`)
      .style("dominant-baseline", "hanging");

    tooltipTextValueRef.current = tooltipGroupRef.current
      .append("text")
      .style("font-size", `${toolTipFontSize}px`)
      .style("dominant-baseline", "hanging")
      .attr("dy", "1em");

    dotRef.current = svg
      .append("circle")
      .attr("r", 4)
      .style("fill", "steelblue")
      .style("opacity", 0);
  }, [data]);

  // syncrhonizing tooltips across the plots
  useEffect(() => {
    const x = xRef.current;
    const y = yRef.current;
    const showToolTip = () => {
      verticalLineRef.current.style("opacity", 0.3);
      tooltipGroupRef.current.style("opacity", 1);
      dotRef.current.style("opacity", 1);
    };
    const hideToolTip = () => {
      verticalLineRef.current.style("opacity", 0);
      tooltipGroupRef.current.style("opacity", 0);
      dotRef.current.style("opacity", 0);
    };

    const updateTooltip = (index) => {
      const activeData = data[index];

      verticalLineRef.current
        .attr("x1", x(activeData.time))
        .attr("x2", x(activeData.time))
        .attr("y1", marginTop)
        .attr("y2", height - marginBottom + marginTop);

      tooltipTextTimeRef.current.text(`${activeData.time} (s)`);
      tooltipTextValueRef.current.text(`${activeData.value} (${units})`);

      dotRef.current
        .attr("cx", x(activeData.time))
        .attr("cy", y(activeData.value));
    };

    const svg = d3.select(svgRef.current);

    svg
      .on("mouseover", () => {
        showToolTip();
      })
      .on("mouseleave", () => {
        hideToolTip();
        setActiveIndex(null);
      })
      .on("mousemove", (event) => {
        const bisect = d3.bisector((d) => d.time).center;
        const index = bisect(data, x.invert(d3.pointer(event)[0]));
        updateTooltip(index);
        setActiveIndex(index);
      });

    if (activeIndex !== null) {
      showToolTip();
      updateTooltip(activeIndex);
    } else {
      hideToolTip();
    }
  }, [data, activeIndex]);

  return (
    <div
      style={{
        padding: `4px`,
      }}
    >
      <svg ref={svgRef} />
    </div>
  );
};

LinePlot.defaultProps = {
  label: "",
  units: "",
  labelFontSize: 16,
  tickFontSize: 14,
  toolTipFontSize: 18,
  height: 400,
  precision: 3,
};

export default LinePlot;
