import React from "react";
import { connect } from "react-redux";
import { removeGasSpecies } from "../../../redux/actions";
import {
  removeAerosolSpecies,
  removeAerosolPhase,
} from "../../../redux/actions";

const Species = ({ details, item: species, setDetails, removeAction }) => {
  const handleDetailClick = (e) => {
    e.preventDefault();
    setDetails({ ...details, [species.name]: species });
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    // the details object is only present is the user is viewing the details of the species
    if (details?.hasOwnProperty(species.name)) {
      const { [species.name]: _, ...newDetails } = details;
      setDetails({ ...newDetails });
    }
    removeAction(species.name);
  };

  return (
    <li className="list-group-item list-group-item-action d-flex justify-content-between detailitem">
      <button
        type="button"
        className="btn-clear"
        onClick={handleDetailClick}
        onKeyDown={handleDetailClick}
      >
        <span className="species-detail-link-item">{species.name}</span>
      </button>
      <button
        type="button"
        className={species.static ? "btn-clear disabled" : "btn-clear"}
        onClick={species.static ? null : handleDeleteClick}
        onKeyDown={species.static ? null : handleDeleteClick}
        disabled={species.static}
      >
        <span className="navlink species-remove m-0 p-0">
          <span
            className="oi oi-x"
            toggle="tooltip"
            aria-hidden="true"
            title={`remove ${species.name}`}
          ></span>
        </span>
      </button>
    </li>
  );
};

const mapDispatchToProps = (dispatch, ownProps) => {
  const { type, subType } = ownProps;

  let action = null;

  switch (type) {
    case "aerosol":
      switch (subType) {
        case "Phases":
          action = (phases) => dispatch(removeAerosolPhase(phases));
          break;
        case "Species":
          action = (species) => dispatch(removeAerosolSpecies(species));
          break;
      }
      break;
    case "gas":
      action = (species) => dispatch(removeGasSpecies(species));
      break;
  }

  return {
    removeAction: action,
  };
};

export default connect(null, mapDispatchToProps)(Species);
