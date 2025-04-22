import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Card from "../components/PreviousResults/Card";
import { ListGroup } from "react-bootstrap";
import { useDispatch } from "react-redux";
import utils from "../redux/utils";
import { resetAll, resetPlots } from "../redux/actions";
import { useNavigate } from "react-router-dom";
import { RunStatus } from "../controllers/models";
import {
  extract_conditions_from_example,
  extract_mechanism_from_example,
} from "../controllers/transformers";

export default function PreviousResults() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [dirs, setDirs] = useState([]);

  useEffect(() => {
    (async () => {
      const dirs = await window.electron.getPrevResults();
      setDirs(dirs);
    })();
  }, []);

  const handleCardClick = async (dir) => {
    dispatch(resetAll());

    const config = await window.electron.loadPreviousConfig(dir);

    const mechanism = extract_mechanism_from_example(config);
    const conditions = extract_conditions_from_example(config, mechanism);
    dispatch({
      type: utils.action_types.EXAMPLE_FETCHED,
      payload: { mechanism: mechanism, conditions: conditions },
    });

    const content = {
      status: "RUNNING",
      error: "",
    };
    dispatch(resetPlots());
    dispatch({
      type: utils.action_types.UPDATE_RUN_STATUS,
      payload: { content },
    });

    const boxModelOutput = await window.electron.loadPreviousResults(dir);

    dispatch({
      type: utils.action_types.UPDATE_RUN_STATUS,
      payload: { content: { status: RunStatus["DONE"], error: {} } },
    });
    dispatch({
      type: utils.action_types.RESULTS_LOADED,
      payload: { content: boxModelOutput },
    });
    navigate("/results");
  };

  return (
    <Layout>
      <main
        role="main"
        style={{
          display: `flex`,
          flexDirection: `column`,
          alignItems: `center`,
          padding: `4em`,
        }}
      >
        <ListGroup
          className="bg-ncar-menu-secondary p-2 text-center"
          style={{ height: `100%`, maxWidth: `750px`, width: `100%` }}
        >
          <h2 className="p-3">Previous Results</h2>
          {dirs.map((dir, index) => (
            <Card
              key={index}
              title={dir}
              onClick={() => handleCardClick(dir)}
            />
          ))}
        </ListGroup>
      </main>
    </Layout>
  );
}
