import React from "react";
import { connect } from "react-redux";
import { MathJax } from "better-react-mathjax";
import Dropdown from "react-bootstrap/Dropdown";
import { updateReactionData } from "../../../redux/actions";
import { getSpeciesNames, getReaction } from "../../../redux/selectors";
import ReactantList from "./ReactantList";
import ProductList from "./ProductList";

const ReactionProperty = (props) => {
  const handleUpdateFloat = (e) => {
    props.updateReactionData({
      id: props.reactionId,
      data: {
        ...props.data,
        [props.schema.key]: parseFloat(e.target.value),
      },
    });
  };

  const handleUpdateInt = (e) => {
    props.updateReactionData({
      id: props.reactionId,
      data: {
        ...props.data,
        [props.schema.key]: parseInt(e.target.value),
      },
    });
  };

  const handleUpdateString = (e) => {
    props.updateReactionData({
      id: props.reactionId,
      data: {
        ...props.data,
        [props.schema.key]: e.target.value,
      },
    });
  };

  const handleUpdateSpecies = (speciesName) => {
    props.updateReactionData({
      id: props.reactionId,
      data: {
        ...props.data,
        [props.schema.key]: speciesName,
      },
    });
  };

  const description = (
    <div
      dangerouslySetInnerHTML={{
        __html: `<p><small>${props.schema.text}</small></p>`,
      }}
    />
  );

  const equation = (
    <>
      <MathJax>{props.schema.value}</MathJax>
      {props.schema.description && props.schema.description.length ? (
        <div
          dangerouslySetInnerHTML={{
            __html: `<p><small>${props.schema.description}</small></p>`,
          }}
        />
      ) : null}
    </>
  );

  const floatInput = (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{props.schema.label}</span>
      </div>
      <input
        type="text"
        className="form-control"
        placeholder="Property value"
        defaultValue={props.data[props.schema.key]}
        onBlur={handleUpdateFloat}
      ></input>
      {props.schema.units && props.schema.units.length ? (
        <div className="input-group-append">
          <span className="input-group-text">
            <div dangerouslySetInnerHTML={{ __html: props.schema.units }} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const intInput = (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{props.schema.label}</span>
      </div>
      <input
        type="text"
        className="form-control"
        placeholder="Property value"
        defaultValue={props.data[props.schema.key]}
        onBlur={handleUpdateInt}
      ></input>
      {props.schema.units && props.schema.units.length ? (
        <div className="input-group-append">
          <span className="input-group-text">
            <div dangerouslySetInnerHTML={{ __html: props.schema.units }} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const stringInput = (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{props.schema.label}</span>
      </div>
      <input
        type="text"
        className="form-control"
        placeholder="Property value"
        defaultValue={props.data[props.schema.key]}
        onBlur={handleUpdateString}
      ></input>
      {props.schema.units && props.schema.units.length ? (
        <div className="input-group-append">
          <span className="input-group-text">
            <div dangerouslySetInnerHTML={{ __html: props.schema.units }} />
          </span>
        </div>
      ) : null}
    </div>
  );

  const speciesInput = (
    <div className="input-group mb-3">
      <div className="input-group-prepend">
        <span className="input-group-text">{props.schema.label}</span>
      </div>
      <Dropdown>
        <Dropdown.Toggle variant="success" className="btn btn-light">
          {props.data[props.schema.key] === undefined
            ? "<select>"
            : props.data[props.schema.key]}
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {props.speciesNames.map((speciesName) => {
            return (
              <Dropdown.Item
                href="#"
                key={speciesName}
                onClick={() => {
                  handleUpdateSpecies(speciesName);
                }}
              >
                {speciesName}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );

  const getProperty = () => {
    switch (props.schema.type) {
      case "DESCRIPTION":
        return description;
      case "EQUATION":
        return equation;
      case "FLOAT":
        return floatInput;
      case "INT":
        return intInput;
      case "STRING":
        return stringInput;
      case "PRODUCT_LIST":
        return (
          <ProductList reactionId={props.reactionId} schema={props.schema} />
        );
      case "REACTANT_LIST":
        return <ReactantList reactionId={props.reactionId} />;
      case "SPECIES":
        return speciesInput;
      default:
        return <div>{props.schema.type}</div>;
    }
  };

  return getProperty();
};

const mapStateToProps = (state, ownProps) => {
  return {
    data: getReaction(state, ownProps.reactionId).data,
    speciesNames: getSpeciesNames(state),
  };
};

export default connect(mapStateToProps, { updateReactionData })(
  ReactionProperty,
);
