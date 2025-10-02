import React from "react";
import { Card, Button } from "react-bootstrap";
import PropertyList from "../Species/PropertyList";
import RepresentationProperty from "./RepresentationProperty";

const ListType = ({ type, item }) => {
  if (type === "Representations") {
    return (
      <div className="form-group properties">
        <RepresentationProperty choice={item} />
      </div>
    );
  } else {
    const species = item;
    return (
      <PropertyList
        type={type}
        species={species}
        speciesName={species.name}
        properties={species.properties}
      />
    );
  }
};

const AerosolDetail = ({ type, subType, item, details, setDetails }) => {
  const handleClick = (e) => {
    let index = subType === "Representations" ? item : item.name;
    e.preventDefault();
    let newDetail = { ...details };
    delete newDetail[index];
    setDetails(newDetail);
  };

  const label = subType === "Representations" ? item : item.name;

  return (
    <Card className="mb-4 species-card shadow-sm">
      <Card.Header>
        <h4 className="my-0 fw-normal">{label}</h4>
      </Card.Header>
      <Card.Body>
        <ListType type={subType} item={item} />
        <div className="container text-center mt-3">
          <Button
            variant="secondary"
            className="btn-cancel"
            onClick={handleClick}
          >
            Close
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AerosolDetail;
