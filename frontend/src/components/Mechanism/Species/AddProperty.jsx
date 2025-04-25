import React from "react";
import Dropdown from "react-bootstrap/Dropdown";

function AddProperty({ addAction, speciesName, options }) {
  const handleAddProperty = (property) => {
    addAction({ property: property, speciesName: speciesName });
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="success" className="btn btn-primary">
        Add property
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {options.map(({ displayName, ...option }, index) => {
          return (
            <Dropdown.Item
              key={index}
              href="#"
              onClick={() => handleAddProperty(option)}
            >
              {displayName}
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default AddProperty;
