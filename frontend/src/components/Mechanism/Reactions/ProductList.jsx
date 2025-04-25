import React from "react";
import { connect } from "react-redux";
import AddProduct from "./AddProduct";
import Product from "./Product";
import { getProducts } from "../../../redux/selectors";

const ProductList = (props) => {
  return (
    <div className="container-fluid property-products mb-3">
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between">
          <h3 className="my-0 fw-normal">{props.schema.label}</h3>
          <AddProduct reactionId={props.reactionId} schema={props.schema} />
        </div>
        <div className="card-body">
          <div className="form-group array-elements array-elements-products container-fluid">
            {props.products && props.products.length
              ? props.products.map((product, index) => {
                  return (
                    <div
                      key={`product-${index}`}
                      className={`row flex-nowrap array-element array-element-${index}`}
                      array-element-index={index}
                    >
                      <Product
                        reactionId={props.reactionId}
                        product={product}
                        schema={props.schema}
                      />
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  const { reactionId, schema } = ownProps;
  const products = getProducts(state, reactionId, schema);
  return { products };
};

export default connect(mapStateToProps)(ProductList);
