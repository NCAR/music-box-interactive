import React from "react";
import { connect } from "react-redux";
import TabbedLayout from "../components/TabbedLayout";
import { MechanismTab, AerosolMechanismTab } from "../components/Mechanism";

// default to false
const { PART_MC = false } = JSON.parse(
  import.meta.env.VITE_FEATURE_FLAGS || "{}",
);

const tabDefinitions = {
  gas: {
    label: "Gas Species",
    component: (props) => <MechanismTab type="gas" {...props} />,
  },
  aerosol: {
    label: "Aerosol",
    component: (props) => <AerosolMechanismTab type="aerosol" {...props} />,
  },
  reactions: {
    label: "Reactions",
    component: (props) => <MechanismTab type="reactions" {...props} />,
  },
};

const tabs = PART_MC
  ? [tabDefinitions.gas, tabDefinitions.aerosol, tabDefinitions.reactions]
  : [tabDefinitions.gas, tabDefinitions.reactions];

function Mechanism() {
  return <TabbedLayout tabs={tabs} title={"Mechanism"} />;
}

export default connect()(Mechanism);
