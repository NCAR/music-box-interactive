import React from "react";
import { connect } from "react-redux";
import { addPlot, removePlot } from "../../redux/actions";
import { getPlotsByType, getSpeciesTolerance } from "../../redux/selectors";

const PlotButton = (props) => {
  const handlePlot = () => {
    if (props.active) {
      props.removePlot({ type: props.type, id: props.plot.id });
    } else {
      props.addPlot({
        type: props.type,
        plot: {
          ...props.plot,
        },
      });
    }
  };

  return (
    <button
      className={`sub_p list-group-item list-group-item-action ${
        props.active ? "active" : null
      }`}
      subtype="normal"
      onClick={handlePlot}
    >
      {props.plot.label}
    </button>
  );
};

const mapStateToProps = (state, ownProps) => {
  return {
    active: getPlotsByType(state, ownProps.type)
      .map((plot) => plot.id)
      .includes(ownProps.plot.id),
    tolerance:
      ownProps.type === "species"
        ? getSpeciesTolerance(state, ownProps.plot.label)
        : 1.0e-12,
  };
};

export default connect(mapStateToProps, { addPlot, removePlot })(PlotButton);
