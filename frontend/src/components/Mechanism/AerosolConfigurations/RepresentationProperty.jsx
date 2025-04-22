import React from "react";
import { connect } from "react-redux";
import { setAerosolRepresentationDetails } from "../../../redux/actions";
import { getMechanism } from "../../../redux/selectors/mechanism.js";

const StringInput = ({ type, value, onChange }) => {
  return (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{type}</span>
      </div>
      <input
        type="text"
        className="form-control"
        placeholder="Please Enter The Phase"
        defaultValue={value}
        onBlur={onChange}
      ></input>
    </div>
  );
};

const IntInput = ({ type, unit, value, onChange }) => {
  return (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{type}</span>
      </div>
      <input
        type="text"
        className="form-control"
        placeholder="Enter An Integer"
        defaultValue={value}
        onBlur={onChange}
      ></input>
      {unit ? (
        <div className="input-group-append">
          <span className="input-group-text">{unit}</span>
        </div>
      ) : null}
    </div>
  );
};

const RepresentationProperty = (props) => {
  const handleUpdateString = (e) => {
    props.setAerosolRepresentationDetails({
      ...props.aerosolRepresentation,
      phase: e.target.value,
    });
  };

  const handleUpdateInt = (key) => (e) => {
    props.setAerosolRepresentationDetails({
      ...props.aerosolRepresentation,
      [key]: parseInt(e.target.value),
    });
  };

  const getProperty = () => {
    switch (props.choice) {
      case "Modal":
        return (
          <>
            <StringInput
              type="phase"
              value={props.aerosolRepresentation["phase"]}
              onChange={handleUpdateString}
            />
            <IntInput
              type="geometric mean diameter"
              unit="m"
              value={props.aerosolRepresentation["geometric mean diameter"]}
              onChange={handleUpdateInt("geometric mean diameter")}
            />
            <IntInput
              type="geometric standard deviation"
              value={
                props.aerosolRepresentation["geometric standard deviation"]
              }
              onChange={handleUpdateInt("geometric standard deviation")}
            />
          </>
        );

      case "Sectional":
        return (
          <>
            <StringInput
              type="phase"
              value={props.aerosolRepresentation["phase"]}
              onChange={handleUpdateString}
            />
            <IntInput
              type="number of sections"
              value={props.aerosolRepresentation["number of sections"]}
              onChange={handleUpdateInt("number of sections")}
            />
            <IntInput
              type="minimum diameter"
              unit="m"
              value={props.aerosolRepresentation["minimum diameter"]}
              onChange={handleUpdateInt("minimum diameter")}
            />
            <IntInput
              type="maximum diameter"
              unit="m"
              value={props.aerosolRepresentation["maximum diameter"]}
              onChange={handleUpdateInt("maximum diameter")}
            />
          </>
        );

      case "Single-Particle":
        return (
          <>
            <StringInput
              type="phase"
              value={props.aerosolRepresentation["phase"]}
              onChange={handleUpdateString}
            />
            <IntInput
              type="total number of computational particles"
              value={
                props.aerosolRepresentation[
                  "total number of computational particles"
                ]
              }
              onChange={handleUpdateInt(
                "total number of computational particles",
              )}
            />
            <div>
              <div
                dangerouslySetInnerHTML={{
                  __html: `<p><small>${"Only enter an integer between 100 and 10000"}</small></p>`,
                }}
              />
            </div>
          </>
        );

      default:
        return <div>Default case</div>;
    }
  };

  return getProperty();
};

const mapStateToProps = (state) => {
  return {
    aerosolRepresentation: getMechanism(state).aerosolRepresentation,
  };
};

export default connect(mapStateToProps, { setAerosolRepresentationDetails })(
  RepresentationProperty,
);
