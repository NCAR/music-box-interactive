import React from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import { updateBasicConfiguration } from "../../redux/actions";

const BasicConfigProperty = (props) => {
  const handleUpdateFloat = (e) => {
    props.updateBasicConfiguration({
      data: {
        ...props.data,
        [props.schema.key]: parseFloat(e.target.value),
      },
    });
  };

  const handleUpdateUnits = (stringValue) => {
    props.updateBasicConfiguration({
      data: {
        ...props.data,
        [props.schema.units.key]: stringValue,
      },
    });
  };

  const floatInput = (
    <>
      <div className="row">
        <div className="col-12">
          <label> {props.schema.label} </label>
        </div>
      </div>
      <div className="row">
        <div className="col-8">
          <input
            type="text"
            className="form-control"
            defaultValue={props.data[props.schema.key]}
            onBlur={handleUpdateFloat}
          ></input>
        </div>
        <div className="col-4">
          {props.schema.units.values && props.schema.units.values.length ? (
            <div className="input-group-append">
              <Dropdown>
                <Dropdown.Toggle variant="success" className="btn btn-light">
                  {props.data[props.schema.units.key]}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {props.schema.units.values.map((units) => {
                    return (
                      <Dropdown.Item
                        href="#"
                        key={units}
                        onClick={() => {
                          handleUpdateUnits(units);
                        }}
                      >
                        {units}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  const getProperty = () => {
    switch (props.schema.type) {
      case "FLOAT":
        return floatInput;
      default:
        return <div>{props.schema.type}</div>;
    }
  };

  return getProperty();
};

export default connect(null, { updateBasicConfiguration })(BasicConfigProperty);
