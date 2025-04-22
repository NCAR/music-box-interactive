import React, { useState } from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import PlotButton from "./PlotButton";
import { updatePlotUnits } from "../../redux/actions";

const PlotSelector = (props) => {
  let initialUnits =
    props.units && props.units.length ? props.units[0] : undefined;
  const [units, setUnits] = useState(initialUnits);

  const handleChangeUnits = (newUnits) => {
    setUnits(newUnits);
    props.updatePlotUnits({ type: props.type, units: newUnits });
  };

  return (
    <nav>
      <ul className="list-group bg-ncar-menu-secondary p-2">
        <div className="my-2">
          {props.units && props.units.length ? (
            <>
              <div className="d-flex justify-content-between">
                Select plot units
              </div>
              <Dropdown className="d-inline-block w-100">
                <Dropdown.Toggle
                  variant="success"
                  className="btn btn-white w-100"
                >
                  {units}
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100">
                  {props.units.map((unit, index) => {
                    return (
                      <Dropdown.Item
                        href="#"
                        key={`units-${index}`}
                        onClick={() => handleChangeUnits(unit)}
                      >
                        {unit}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </>
          ) : null}
        </div>
        <div className="d-flex justify-content-between">
          Select options to plot
        </div>
        {props.availablePlots.map((plot, index) => {
          return (
            <PlotButton
              type={props.type}
              plot={{ ...plot, units: units }}
              key={`plot-${index}`}
            />
          );
        })}
      </ul>
    </nav>
  );
};

export default connect(null, { updatePlotUnits })(PlotSelector);
