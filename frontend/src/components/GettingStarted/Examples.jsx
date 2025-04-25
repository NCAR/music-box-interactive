import React from "react";
import { useDispatch } from "react-redux";
import utils from "../../redux/utils";
import { resetAll, getExample } from "../../redux/actions";
import { useNavigate } from "react-router-dom";

const examples = [
  {
    title: "Chapman Cycle",
    description: "Chemistry of the ozone layer.",
    type: utils.examples.CHAPMAN,
  },
  {
    title: "Flow-Tube Wall Loss",
    description:
      "A simple characterization of wall loss of a-Pinene oxidation products in a flow-tube reactor.",
    type: utils.examples.FLOW_TUBE,
  },
  {
    title: "Full Gas-Phase Mechanism",
    description:
      "A variant of the Carbon Bond 5 chemical mechanism used in the MONARCH global/regional chemical weather prediction system.",
    link: "https://gmd.copernicus.org/articles/10/609/2017/",
    linkText:
      "The description of the modified version of CB-05 used in MONARCH",
    type: utils.examples.FULL_GAS_PHASE,
  },
  {
    title: "Troposphere-Stratosphere mechanism (TS1)",
    description:
      "A comprehensive model of the chemistry in the troposphere and straosphere",
    link: "https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2019MS001882",
    linkText: "Read about its formulation in this paper",
    type: utils.examples.TS1,
  },
];

export default function Examples() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleClick = (example) => {
    dispatch(resetAll());
    dispatch(getExample(example.type));
    navigate("/mechanism");
  };

  const renderExample = (example, index) => (
    <div className="col" key={index}>
      <div className="card card-body example-panel m-2">
        <div>
          <h3>{example.title}</h3>
        </div>
        <div>
          {example.description}
          &nbsp;
          {example.link && (
            <a href={example.link} target="_blank" rel="noopener noreferrer">
              {example.linkText || "Learn more"}
            </a>
          )}
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            handleClick(example);
          }}
        >
          Select
        </button>
      </div>
    </div>
  );

  return <div className="row">{examples.map(renderExample)}</div>;
}
