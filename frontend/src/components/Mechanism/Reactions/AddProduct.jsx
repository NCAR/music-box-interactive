import React from "react";
import { connect } from "react-redux";
import { addProduct } from "../../../redux/actions";

const AddProduct = (props) => {
  const handleAddProduct = (product) => {
    props.addProduct({
      reactionId: props.reactionId,
      schema: props.schema,
      product: product,
    });
  };

  return (
    <button
      type="button"
      className="btn btn-primary add-element"
      onClick={() => handleAddProduct({ name: undefined, yield: 1.0 })}
      onKeyDown={() => handleAddProduct({ name: undefined, yield: 1.0 })}
    >
      <span
        className="oi oi-plus"
        toggle="tooltip"
        aria-hidden="true"
        title="Add product"
      ></span>
    </button>
  );
};

export default connect(null, { addProduct })(AddProduct);
