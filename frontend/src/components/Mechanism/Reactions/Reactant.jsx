import React from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import { addReactant } from "../../../redux/actions";
import { getSpeciesNames } from "../../../redux/selectors";
import RemoveReactant from "./RemoveReactant";

const Reactant = (props) => {
  const reactant = props.reactant;

  const handleChangeSpecies = (e) => {
    props.addReactant({
      reactionId: props.reactionId,
      reactant: {
        ...reactant,
        name: e.target.innerHTML,
      },
    });
  };

  const handleChangeQty = (e) => {
    props.addReactant({
      reactionId: props.reactionId,
      reactant: {
        ...reactant,
        qty: parseInt(e.target.value),
      },
    });
  };

  return (
    <>
      <div className="col-3">
        <Dropdown>
          <Dropdown.Toggle variant="success" className="btn btn-light">
            {reactant.name && reactant.name.length ? reactant.name : "<none>"}
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {props.speciesNames.map((speciesName) => {
              return (
                <Dropdown.Item
                  href="#"
                  key={speciesName}
                  onClick={handleChangeSpecies}
                >
                  {speciesName}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown>
      </div>
      <div className="col-7 element-properties">
        <div className="container-fluid property-qty mb-3">
          <div className="input-group" property="qty" data-type="int">
            <div className="input-group-prepend">
              <span className="input-group-text">qty</span>
            </div>
            <input
              type="text"
              className="form-control"
              defaultValue={reactant.qty}
              onBlur={handleChangeQty}
            ></input>
          </div>
        </div>
      </div>
      <div className="col-2 d-flex justify-content-between">
        <div></div>
        <RemoveReactant
          reactionId={props.reactionId}
          reactantId={props.reactant.id}
        />
        <div></div>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return { speciesNames: getSpeciesNames(state) };
};

export default connect(mapStateToProps, { addReactant })(Reactant);
