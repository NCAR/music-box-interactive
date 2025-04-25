import React from "react";
import { Card, Button } from "react-bootstrap";
import PropertyList from "./Species/PropertyList";
import ReactionProperty from "./Reactions/ReactionProperty";

const ListType = ({ type, item }) => {
  if (type === "reactions") {
    const reaction = item;
    return (
      <div className="form-group properties">
        {reaction.elements.map((element, index) => {
          return (
            <ReactionProperty
              key={`property-${index}`}
              schema={element}
              data={reaction.data}
              reactionId={reaction.id}
            />
          );
        })}
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

const Detail = ({ type, item, details, setDetails }) => {
  const handleClick = (e) => {
    let index = type === "reactions" ? item.id : item.name;
    e.preventDefault();
    let newDetail = { ...details };
    delete newDetail[index];
    setDetails(newDetail);
  };

  const label = type === "reactions" ? item.typeLabel : item.name;

  return (
    <Card className="mb-4 species-card shadow-sm">
      <Card.Header>
        <h4 className="my-0 fw-normal">{label}</h4>
      </Card.Header>
      <Card.Body>
        <ListType type={type} item={item} />
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

export default Detail;
