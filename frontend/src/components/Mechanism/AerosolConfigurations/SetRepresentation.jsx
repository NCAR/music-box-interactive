import React, { useState } from "react";
import { useSelector, connect } from "react-redux";
import { setAerosolRepresentation } from "../../../redux/actions";
import { Container, ListGroup } from "react-bootstrap";
import Dropdown from "react-bootstrap/Dropdown";
import { getMechanism } from "../../../redux/selectors/mechanism.js";

function SetRepresentation(prop) {
  const { addAction } = prop;

  function handleSetConfig(config_name) {
    addAction(config_name);
  }

  const handleDetailClick = (e) => {
    e.preventDefault();
    const representation = subTabMap.get(activeSubTab);

    if (prop.details?.hasOwnProperty(previousRepresentation)) {
      const { [previousRepresentation]: _, ...newDetails } = prop.details;
      prop.setDetails({ ...newDetails });
    }
    prop.setDetails({ [representation]: representation });
    setPreviousRepresentation(representation);
  };

  const tabChoices = ["Modal", "Sectional", "Single-Particle"];
  const [activeSubTab, setActiveSubTab] = useState(0);
  const [previousRepresentation, setPreviousRepresentation] = useState("");
  const subTabMap = new Map([
    [0, "Modal"],
    [1, "Sectional"],
    [2, "Single-Particle"],
  ]);

  return (
    <Container fluid className="bg-ncar-menu-secondary p-2">
      <Dropdown>
        <Dropdown.Toggle variant="success" className="btn btn-primary">
          Choose Representation
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {tabChoices.map((value, index) => {
            return (
              <Dropdown.Item
                onClick={() => {
                  handleSetConfig(value);
                  setActiveSubTab(index);
                }}
              >
                {value}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
      <ListGroup className="species-list" style={{ marginTop: "15px" }}>
        <li className="list-group-item list-group-item-action d-flex">
          <button
            type="button"
            className="btn-clear"
            onClick={handleDetailClick}
          >
            {subTabMap.get(activeSubTab)}
          </button>
        </li>
      </ListGroup>
    </Container>
  );
}

const mapStateToProps = (state) => {
  return {
    aerosolRepresentation: getMechanism(state).aerosolRepresentationConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  let action = (content) => {
    dispatch(setAerosolRepresentation(content));
  };
  return {
    addAction: action,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetRepresentation);
