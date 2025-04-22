import React from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import { addReaction } from "../../../redux/actions";
import { reactionSchema } from "../../../redux/schemas";

function AddReaction(props) {
  const handleAddReaction = (reaction) => {
    props.addReaction(reaction);
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" className="btn btn-primary">
        Add Reaction
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {Object.entries(reactionSchema).map(([key, value]) => {
          return (
            <Dropdown.Item
              href="#"
              key={key}
              onClick={() => handleAddReaction(value)}
            >
              {value.typeLabel}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default connect(null, { addReaction })(AddReaction);
