import React, { useState } from "react";
import { connect } from "react-redux";
import Layout from "../components/Layout";
import { PlotsTab } from "../components/Plots";
import {
  getRunStatus,
  getSpeciesPlots,
  getReactionPlots,
  getEnvironmentPlots,
  getAerosolPlots,
} from "../redux/selectors";
import { RunStatus } from "../controllers/models";
import { plotSpeciesUnits } from "../redux/schemas";

const Plots = (props) => {
  const SPECIES = 0;
  const REACTIONS = 1;
  const ENVIRONMENT = 2;
  const AEROSOLS = 3;
  const [tab, setTab] = useState(SPECIES);

  const tabSelected = "btn btn-primary btn-ncar-active";
  const tabNotSelected = "btn btn-secondary";

  const featureFlags = JSON.parse(import.meta.env.VITE_FEATURE_FLAGS || "{}");

  return (
    <Layout title={"Plots"}>
      <div className="container text-center">
        {props.runStatus === RunStatus.DONE ? (
          <>
            <div className="navbox pt-2">
              <button
                className={tab === SPECIES ? tabSelected : tabNotSelected}
                onClick={() => setTab(SPECIES)}
                style={{ marginRight: "15px" }}
              >
                Chemical species
              </button>
              <button
                className={tab === REACTIONS ? tabSelected : tabNotSelected}
                onClick={() => setTab(REACTIONS)}
                style={{ marginRight: "15px" }}
              >
                Reaction rates
              </button>
              <button
                className={tab === ENVIRONMENT ? tabSelected : tabNotSelected}
                onClick={() => setTab(ENVIRONMENT)}
                style={{ marginRight: "15px" }}
              >
                Environmental conditions
              </button>
              {featureFlags.PART_MC && (
                <button
                  className={tab === AEROSOLS ? tabSelected : tabNotSelected}
                  onClick={() => setTab(AEROSOLS)}
                  style={{ marginRight: "15px" }}
                >
                  Aerosols
                </button>
              )}
            </div>
            {tab === SPECIES ? (
              <PlotsTab
                plotType="species"
                availablePlots={props.speciesPlots}
                units={plotSpeciesUnits}
              />
            ) : null}
            {tab === REACTIONS ? (
              <PlotsTab
                plotType="reactions"
                availablePlots={props.reactionPlots}
                units={plotSpeciesUnits}
              />
            ) : null}
            {tab === ENVIRONMENT ? (
              <PlotsTab
                plotType="environment"
                availablePlots={props.environmentPlots}
              />
            ) : null}
            {tab === AEROSOLS && featureFlags.PART_MC ? (
              <PlotsTab
                plotType="aerosols"
                availablePlots={props.aerosolPlots}
                //units={plotSpeciesUnits}
              />
            ) : null}
          </>
        ) : (
          <p> Plots will be available once a model run has been completed </p>
        )}
      </div>
    </Layout>
  );
};

const mapStateToProps = (state) => {
  return {
    runStatus: getRunStatus(state),
    speciesPlots: getSpeciesPlots(state),
    reactionPlots: getReactionPlots(state),
    environmentPlots: getEnvironmentPlots(state),
    aerosolPlots: getAerosolPlots(state),
  };
};

export default connect(mapStateToProps)(Plots);
