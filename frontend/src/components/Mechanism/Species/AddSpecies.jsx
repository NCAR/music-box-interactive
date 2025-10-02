import React, { useState } from "react";
import { connect } from "react-redux";
import {
  addAerosolSpecies,
  addGasSpecies,
  addAerosolRepresentation,
  addAerosolPhase,
} from "../../../redux/actions";

function AddSpecies(props) {
  const { type, subType, addAction } = props;

  const [state, setState] = useState("");

  const updateInput = (input) => {
    setState(input);
  };

  const clickEnter = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSpecies();
    }
  };

  const handleAddSpecies = () => {
    addAction({ name: state, properties: [] });
    setState("");
  };

  return (
    <div>
      <input
        type="text"
        className="form-control mb-2"
        onChange={(e) => updateInput(e.target.value)}
        value={state}
        onKeyDown={clickEnter}
      />
      <button
        className="btn btn-primary mb-2 add-gas-species"
        onClick={handleAddSpecies}
      >
        {subType === undefined
          ? `Add ${type.charAt(0).toUpperCase() + type.slice(1)} Species`
          : `Add ${subType.charAt(0).toUpperCase() + subType.slice(1)}`}
      </button>
    </div>
  );
}

const mapDispatchToProps = (dispatch, ownProps) => {
  const { type, subType } = ownProps;

  let action = null;

  switch (type) {
    case "aerosol":
      switch (subType) {
        case "Phases":
          action = (Phase) => dispatch(addAerosolPhase(Phase));
          break;
        case "Representations":
          action = (Representation) =>
            dispatch(addAerosolRepresentation(Representation));
          break;
        case "Species":
          action = (species) => dispatch(addAerosolSpecies(species));
          break;
      }
      break;
    case "gas":
      action = (species) => dispatch(addGasSpecies(species));
      break;
  }

  return {
    addAction: action,
  };
};

export default connect(null, mapDispatchToProps)(AddSpecies);
