import React, { useState } from "react";
import { connect } from "react-redux";
import { Container, Row, Col } from "react-bootstrap";
import { Link } from "react-router-dom";

import List from "./List";
import Detail from "./Detail";

const InstructionsComponent = ({ type, tabIndexMap, setActiveTab }) => {
  if (type === "reactions") {
    return (
      <p className="lead-muted p-2">
        Select a reaction from the list to view/edit its properties, or add a
        new reaction to the mechanism. The chemical species available to
        participate in reactions can be modified{" "}
        <span
          onClick={() => {
            setActiveTab(tabIndexMap["Gas Species"]);
          }}
          className="fake-link"
        >
          here
        </span>
        .
      </p>
    );
  } else {
    return (
      <p className="lead-muted p-2">
        Select a chemical species from the list to view/edit its properties, or
        add a new chemical species to the mechansim. The chemical species you
        add here will be available to participate in{" "}
        <span
          onClick={() => {
            setActiveTab(tabIndexMap["Reactions"]);
          }}
          className="fake-link"
        >
          reactions
        </span>
        &nbsp;and can be include in the{" "}
        <Link to="/conditions">model conditions</Link>.
      </p>
    );
  }
};

function MechanismTab({ type, tabIndexMap, setActiveTab }) {
  const [details, setDetails] = useState({});
  return (
    <>
      <InstructionsComponent
        type={type}
        tabIndexMap={tabIndexMap}
        setActiveTab={setActiveTab}
      />
      <Container
        fluid
        className="p-2 d-flex flex-column vh-100 overflow-hidden"
      >
        <Row className="flex-grow-1 overflow-hidden">
          <Col md={4} lg={4} className="mh-100 overflow-auto">
            <Row className="flex-shrink-0">
              <Col>
                <List type={type} details={details} setDetails={setDetails} />
              </Col>
            </Row>
          </Col>
          <Col className="mh-100 overflow-auto">
            <Row className="flex-shrink-0">
              <Col className="species-detail">
                {Object.keys(details).map((key) => (
                  <Detail
                    type={type}
                    item={details[key]}
                    key={key}
                    details={details}
                    setDetails={setDetails}
                  />
                ))}
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default connect()(MechanismTab);
