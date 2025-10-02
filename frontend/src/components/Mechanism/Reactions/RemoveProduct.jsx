import React from "react";
import { connect } from "react-redux";
import { removeProduct } from "../../../redux/actions";

const RemoveProduct = (props) => {
  const handleRemoveProduct = () => {
    props.removeProduct({
      reactionId: props.reactionId,
      schema: props.schema,
      productId: props.productId,
    });
  };

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary remove-element"
        onClick={handleRemoveProduct}
        onKeyDown={handleRemoveProduct}
      >
        <span
          className="oi oi-x"
          toggle="tooltip"
          aria-hidden="true"
          title="Remove product"
        ></span>
      </button>
    </div>
  );
};

export default connect(null, { removeProduct })(RemoveProduct);
