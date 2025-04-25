import React, { useState } from "react";
import { connect } from "react-redux";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

import List from "./List";
import AerosolDetail from "./AerosolConfigurations/AerosolDetail";
import SetRepresentation from "./AerosolConfigurations/SetRepresentation";

const InstructionsComponent = ({ tabIndexMap, setActiveTab }) => {
  return (
    <p className="lead-muted p-2">
      Select a chemical species from the list to view/edit its properties, or
      add a new chemical species to the mechanism. The chemical species you add
      here will be available to participate in{" "}
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
};

function AerosolMechanismTab({ type, tabIndexMap, setActiveTab }) {
  const [details, setDetails] = useState({});
  const [activeSubTab, setActiveSubTab] = useState(0);

  const subTabs = ["Species", "Phases", "Representations"];

  const subTabMap = new Map([
    [0, "Species"],
    [1, "Phases"],
    [2, "Representations"],
  ]);

  const handleActiveSubTab = (index) => {
    setDetails({});
    setActiveSubTab(index);
  };

  return (
    <>
      <InstructionsComponent
        tabIndexMap={tabIndexMap}
        setActiveTab={setActiveTab}
      />
      <Container className="text-center">
        <div
          className="navbox pt-2"
          style={{ display: "flex", justifyContent: "space-around" }}
        >
          {subTabs.map((subTab, index) => (
            <Button
              key={index}
              variant={activeSubTab === index ? "primary" : "secondary"}
              className="mr-2"
              onClick={() => handleActiveSubTab(index)}
            >
              {subTab}
            </Button>
          ))}
        </div>
      </Container>

      <Container
        fluid
        className="p-2 d-flex flex-column vh-100 overflow-hidden"
      >
        <Row className="flex-grow-1 overflow-hidden">
          <Col md={4} lg={4} className="mh-100 overflow-auto">
            <Row className="flex-shrink-0">
              <Col>
                {subTabMap.get(activeSubTab) === "Representations" ? (
                  <SetRepresentation
                    details={details}
                    setDetails={setDetails}
                  />
                ) : (
                  <List
                    type={type}
                    subType={subTabMap.get(activeSubTab)}
                    details={details}
                    setDetails={setDetails}
                  />
                )}
              </Col>
            </Row>
          </Col>
          <Col className="mh-100 overflow-auto">
            <Row className="flex-shrink-0">
              <Col className="species-detail">
                {Object.keys(details).map((key) => (
                  <AerosolDetail
                    type={type}
                    subType={subTabMap.get(activeSubTab)}
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

export default connect()(AerosolMechanismTab);
