import React from "react";
import { connect } from "react-redux";
import { removeEvolvingCondition } from "../../redux/actions";

const RemoveEvolvingCondition = (props) => {
  const handleRemoveCondition = () => {
    props.removeEvolvingCondition({ conditionIndex: props.conditionIndex });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-small btn-primary remove-element"
        onClick={handleRemoveCondition}
      >
        <span
          className="oi oi-x"
          toggle="tooltip"
          aria-hidden="true"
          title="Remove condition"
        ></span>
      </button>
    </div>
  );
};

export default connect(null, { removeEvolvingCondition })(
  RemoveEvolvingCondition,
);
