import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import Examples from "./Examples";
import LoadFile from "./LoadFile";
import utils from "../../redux/utils";
import { resetAll } from "../../redux/actions";
import { useNavigate } from "react-router-dom";

export default function QuickStart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [method, setMethod] = useState(utils.methods.NONE_SELECTED);
  // toggle the component related to the method selected
  const setMethodWrapper = (method_selected) => {
    if (method !== method_selected) {
      setMethod(method_selected);
    } else {
      setMethod(utils.methods.NONE_SELECTED);
    }
  };

  useEffect(() => {
    if (method === utils.methods.START_FROM_SCRATCH) {
      dispatch(resetAll());
      navigate("/mechanism");
    }
  }, [method, dispatch]);

  return (
    <section className="jumbotron text-center">
      <div className="container">
        <h1 className="jumbotron-heading ">Getting Started</h1>
        <p className="lead text-muted">
          To get started with MusicBox, you can try out one of our example
          configurations, start a new mechanism from scratch, or load a
          configuration file you saved from a previous run. For a collection of
          pre-made stratospheric <br />
          and tropospheric configurations, visit{" "}
          <a
            target="_blank"
            href="https://github.com/NCAR/musicbox_curriculum_exercises"
            rel="noreferrer"
          >
            this repository
          </a>
        </p>
        <p>
          <MethodButton
            clickHandler={() => setMethodWrapper(utils.methods.USE_TEMPLATE)}
          >
            Select example
          </MethodButton>
          <MethodButton
            clickHandler={() =>
              setMethodWrapper(utils.methods.START_FROM_SCRATCH)
            }
          >
            Start from scratch
          </MethodButton>
          <MethodButton
            clickHandler={() => setMethodWrapper(utils.methods.UPLOAD_CONFIG)}
          >
            Upload configuration file
          </MethodButton>
        </p>
        {method === utils.methods.USE_TEMPLATE ? <Examples /> : null}
        {method === utils.methods.UPLOAD_CONFIG ? <LoadFile /> : null}
      </div>
    </section>
  );
}

function MethodButton(props) {
  return (
    <button
      className="btn btn-primary btn-lg btn-ncar-active my-2 mx-3"
      onClick={props.clickHandler}
    >
      {props.children}
    </button>
  );
}
