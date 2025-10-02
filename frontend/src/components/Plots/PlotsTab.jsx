import React, { useState } from "react";
import { connect } from "react-redux";
import PlotSelector from "./PlotSelector";
import { getPlotsByType, getPlotDataByType } from "../../redux/selectors";
import LinePlot from "./LinePlot";

const PlotsTab = (props) => {
  const [activeIndex, setActiveIndex] = useState(null);
  return (
    <div className="container-fluid p-2 d-flex flex-column vh-100 overflow-hidden">
      <div className="row flex-grow-1 overflow-hidden">
        <div className="col-md-4 col-lg-3 mh-100 overflow-auto">
          <div className="row flex-shrink-0">
            <div className="col">
              <PlotSelector
                type={props.plotType}
                availablePlots={props.availablePlots}
                units={props.units}
              />
            </div>
          </div>
        </div>
        <div className="col mh-100 overflow-auto">
          {props.plots.map((plot) => {
            return (
              <LinePlot
                key={plot.label}
                data={plot.data}
                label={plot.label}
                units={plot.units}
                activeIndex={activeIndex}
                setActiveIndex={setActiveIndex}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  const avilablePlots = getPlotsByType(state, ownProps.plotType);
  const plotData = avilablePlots.map((plot) => getPlotDataByType(state, plot));
  return {
    plots: plotData,
  };
};

export default connect(mapStateToProps)(PlotsTab);
