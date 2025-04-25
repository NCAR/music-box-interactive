import React, { useState, useRef, useEffect } from "react";
import { connect } from "react-redux";
import { ThreeCircles } from "react-loader-spinner";
import { Container, Alert } from "react-bootstrap";
import Layout from "../components/Layout";
import { getRunStatus, getLastError } from "../redux/selectors";
import { RunStatus } from "../controllers/models";
import { useNavigate } from "react-router-dom";
import isElectron from "is-electron";

const ResultsRunning = (props) => {
  const colors = ["#91A6FF", "#FF88DC", "#FF5154"];
  let outerCircleColor = props.updateCount % 3 === 2 ? colors[0] : "";
  let middleCircleColor = props.updateCount % 3 === 1 ? colors[1] : "";
  let innerCircleColor = props.updateCount % 3 === 0 ? colors[2] : "";

  return (
    <div style={{ display: `flex`, justifyContent: `center`, margin: `auto` }}>
      <ThreeCircles
        height="100"
        width="100"
        color="#4fa94d"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
        ariaLabel="three-circles-rotating"
        outerCircleColor={outerCircleColor}
        innerCircleColor={innerCircleColor}
        middleCircleColor={middleCircleColor}
      />
    </div>
  );
};

const ResultsDone = () => {
  const [name, setName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const handleSave = async (name) => {
    if (!name.trim()) {
      setModalMessage("Please enter a simulation name");
      setModalOpen(true);
      return;
    }

    try {
      await window.electron.saveResults(name);
      setModalMessage("Results saved successfully!");
    } catch (error) {
      setModalMessage("An error occurred while saving the results");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const navigate = useNavigate();
  const { FLOW_DIAGRAM = false } = JSON.parse(
    import.meta.env.VITE_FEATURE_FLAGS || "{}",
  );

  return (
    <>
      <h1>Your simulation is finished!</h1>
      <p>
        You can now plot your results or download them for offline analysis.
      </p>
      <div
        style={{
          display: `flex`,
          justifyContent: `space-around`,
        }}
      >
        <button
          style={{ margin: "auto" }}
          className="btn btn-primary btn-ncar-active"
          onClick={() => {
            navigate("/plots");
          }}
        >
          Plots
        </button>
        {FLOW_DIAGRAM && (
          <>
            <button
              style={{ margin: "auto" }}
              className="btn btn-primary btn-ncar-active"
              onClick={() => {
                navigate("/flow_diagram");
              }}
            >
              Flow Diagram
            </button>
          </>
        )}
        <button
          style={{ margin: "auto" }}
          className="btn btn-primary btn-ncar-active"
          onClick={() => {
            navigate("/downloads");
          }}
        >
          Download Results
        </button>
      </div>
      {isElectron() && (
        <div
          style={{
            display: `flex`,
            justifyContent: "center",
            alignItems: "center",
            gap: `1em`,
            paddingTop: `2em`,
          }}
        >
          <input
            type="text"
            placeholder="Enter simulation name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              paddingLeft: `12px`,
              paddingRight: `12px`,
              paddingTop: `6px`,
              paddingBottom: `6px`,
              borderRadius: `0.375rem`,
              flex: `1`,
              maxWidth: `600px`,
            }}
          />
          <button
            className="btn btn-primary btn-ncar-active"
            onClick={() => handleSave(name)}
          >
            Save
          </button>
        </div>
      )}
      {modalOpen && (
        <>
          <div className="overlay"></div>
          <div className="custom-modal">
            <p className="fs-3">{modalMessage}</p>
            <button
              className="btn btn-primary btn-ncar-active"
              onClick={() => closeModal()}
            >
              OK
            </button>
          </div>
        </>
      )}
    </>
  );
};

const ResultsError = (props) => {
  return (
    <>
      <h1>You have encountered an error</h1>
      <Alert variant="danger">{props.errorMessage}</Alert>
    </>
  );
};

const ResultsNotStarted = () => {
  return (
    <>
      <h1>To run a simulation, click the green Run button to the left</h1>
      <p>The possibilities are limitless.</p>
    </>
  );
};

const Results = ({ runStatus, error }) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
  });

  return (
    <Layout>
      <Container className="jumbotron text-center hero-img">
        {(() => {
          switch (runStatus) {
            case RunStatus.RUNNING:
              return <ResultsRunning updateCount={renderCount.current} />;
            case RunStatus.DONE:
              return <ResultsDone />;
            case RunStatus.ERROR:
              return <ResultsError errorMessage={error.message} />;
            case RunStatus.WAITING:
              return <ResultsNotStarted />;
            case RunStatus.NOT_FOUND:
              return (
                <ResultsError errorMessage="Unexpected server error. Please try your run again." />
              );
            default:
              console.error(`Unknown model run status: ${runStatus}`);
              return <ResultsNotStarted />;
          }
        })()}
      </Container>
    </Layout>
  );
};

const mapStateToProps = (state) => {
  return {
    runStatus: getRunStatus(state),
    error: getLastError(state),
  };
};

export default connect(mapStateToProps)(Results);
