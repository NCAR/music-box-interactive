import React from "react";
import { connect } from "react-redux";
import { removeReactant } from "../../../redux/actions";

const RemoveReactant = (props) => {
  const handleRemoveReactant = () => {
    props.removeReactant({
      reactionId: props.reactionId,
      reactantId: props.reactantId,
    });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary remove-element"
        onClick={handleRemoveReactant}
        onKeyDown={handleRemoveReactant}
      >
        <span
          className="oi oi-x"
          toggle="tooltip"
          aria-hidden="true"
          title="Remove reactant"
        ></span>
      </button>
    </div>
  );
};

export default connect(null, { removeReactant })(RemoveReactant);
