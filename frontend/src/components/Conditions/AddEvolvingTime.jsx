import React from "react";
import { connect } from "react-redux";
import { addEvolvingTime } from "../../redux/actions";

const AddEvolvingTime = (props) => {
  const handleAddTime = () => {
    props.addEvolvingTime();
  };

  return (
    <button
      className="btn btn-primary mb-2 add-condition"
      onClick={handleAddTime}
    >
      Add Row
    </button>
  );
};

export default connect(null, { addEvolvingTime })(AddEvolvingTime);
