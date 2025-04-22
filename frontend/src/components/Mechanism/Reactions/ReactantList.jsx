import React from "react";
import { connect } from "react-redux";
import AddReactant from "./AddReactant";
import Reactant from "./Reactant";
import { getReactants } from "../../../redux/selectors";

const ReactantList = (props) => {
  return (
    <div className="container-fluid property-reactants mb-3">
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between">
          <h3 className="my-0 fw-normal">reactants</h3>
          <AddReactant reactionId={props.reactionId} />
        </div>
        <div className="card-body">
          <div className="form-group array-elements array-elements-reactants container-fluid">
            {props?.reactants?.map((reactant, index) => {
              return (
                <div
                  key={`reactant-${reactant.id}`}
                  className={`row flex-nowrap array-element array-element-${index}`}
                  array-element-index={index}
                >
                  <Reactant reactionId={props.reactionId} reactant={reactant} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (state, ownProps) => {
  const { reactionId } = ownProps;
  const reactants = getReactants(state, reactionId);
  return { reactants };
};

export default connect(mapStateToProps)(ReactantList);
