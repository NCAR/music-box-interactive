import React from "react";
import { connect } from "react-redux";
import { removeEvolvingTime } from "../../redux/actions";

const RemoveEvolvingTime = (props) => {
  const handleRemoveTime = () => {
    props.removeEvolvingTime({ timeIndex: props.timeIndex });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-small btn-primary remove-element"
        onClick={handleRemoveTime}
      >
        <span
          className="oi oi-x"
          toggle="tooltip"
          aria-hidden="true"
          title="Remove row"
        ></span>
      </button>
    </div>
  );
};

export default connect(null, { removeEvolvingTime })(RemoveEvolvingTime);
