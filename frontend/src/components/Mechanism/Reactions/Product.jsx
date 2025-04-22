import React from "react";
import { connect } from "react-redux";
import Dropdown from "react-bootstrap/Dropdown";
import { addProduct } from "../../../redux/actions";
import { getSpeciesNames } from "../../../redux/selectors";
import RemoveProduct from "./RemoveProduct";

const Product = (props) => {
  const product = props.product;
  const schema = props.schema;

  const handleChangeSpecies = (e) => {
    props.addProduct({
      reactionId: props.reactionId,
      schema: schema,
      product: {
        ...product,
        name: e.target.innerHTML,
      },
    });
  };

  const handleChangeYield = (e) => {
    props.addProduct({
      reactionId: props.reactionId,
      schema: schema,
      product: {
        ...product,
        yield: parseFloat(e.target.value),
      },
    });
  };

  return (
    <>
      <div className="col-3">
        <Dropdown>
          <Dropdown.Toggle variant="success" className="btn btn-light">
            {product.name && product.name.length ? product.name : "<none>"}
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
        <div className="container-fluid property-yield mb-3">
          <div className="input-group" property="yield" data-type="int">
            <div className="input-group-prepend">
              <span className="input-group-text">yield</span>
            </div>
            <input
              type="text"
              className="form-control"
              defaultValue={product.yield}
              onBlur={handleChangeYield}
            ></input>
          </div>
        </div>
      </div>
      <div className="col-2 d-flex justify-content-between">
        <div></div>
        <RemoveProduct
          reactionId={props.reactionId}
          schema={props.schema}
          productId={props.product.id}
        />
        <div></div>
      </div>
    </>
  );
};

const mapStateToProps = (state) => {
  return { speciesNames: getSpeciesNames(state) };
};

export default connect(mapStateToProps, { addProduct })(Product);
