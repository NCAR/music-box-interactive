import React from "react";
import { connect } from "react-redux";
import TabbedLayout from "../components/TabbedLayout";
import {
  BasicConfigurationTab,
  InitialConditionsTab,
  EvolvingConditionsTab,
} from "../components/Conditions";

const tabs = [
  { label: "Basic", component: BasicConfigurationTab },
  { label: "Initial", component: InitialConditionsTab },
  { label: "Evolving", component: EvolvingConditionsTab },
];

function Conditions() {
  return <TabbedLayout title={"Conditions"} tabs={tabs} />;
}

export default connect()(Conditions);
