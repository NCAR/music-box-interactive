import React from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import { addEvolvingCondition } from "../../redux/actions";
import {
  getEvolvingConditions,
  getPossibleConditions,
} from "../../redux/selectors";

const AddEvolvingCondition = (props) => {
  const handleAddCondition = (condition) => {
    props.addEvolvingCondition({ condition: condition });
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" className="btn btn-primary">
        Add Condition
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {props.possibleConditions.map((condition, index) => {
          return (
            <Dropdown.Item
              href="#"
              key={index}
              onClick={() => handleAddCondition(condition)}
            >
              {condition.name}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
};

const mapStateToProps = (state) => {
  const currentConditions = getEvolvingConditions(state).values.map(
    (condition) => condition.name,
  );
  return {
    possibleConditions: getPossibleConditions(state).filter((condition) => {
      return !currentConditions.includes(condition.name);
    }),
  };
};

export default connect(mapStateToProps, { addEvolvingCondition })(
  AddEvolvingCondition,
);
