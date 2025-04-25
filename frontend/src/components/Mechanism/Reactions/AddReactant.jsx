import React from "react";
import { connect } from "react-redux";
import { addReactant } from "../../../redux/actions";
import { v4 as uuidv4 } from "uuid";

const AddReactant = (props) => {
  const handleAddReactant = (reactant) => {
    props.addReactant({ reactionId: props.reactionId, reactant: reactant });
  };

  return (
    <button
      type="button"
      className="btn btn-primary add-element"
      onClick={() =>
        handleAddReactant({ name: undefined, qty: 1, id: uuidv4() })
      }
      onKeyDown={() =>
        handleAddReactant({ name: undefined, qty: 1, id: uuidv4() })
      }
    >
      <span
        className="oi oi-plus"
        toggle="tooltip"
        aria-hidden="true"
        title="Add reactant"
      ></span>
    </button>
  );
};

export default connect(null, { addReactant })(AddReactant);
