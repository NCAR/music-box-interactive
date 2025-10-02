import React from "react";
import aboutImg from "../../assets/image_calvin.jpg";
import { Link } from "react-router-dom";

export default function About() {
  const aboutStyle = {
    backgroundImage: `url(${aboutImg})`,
  };

  return (
    <div
      id="about"
      className="jumbotron text-center hero-img"
      style={aboutStyle}
    >
      <div className="container">
        <h1 className="display-2">MusicBox</h1>
        <h1 className="display-6">an atmospheric box model</h1>
        <p className="lead hero-text">
          Simulate chamber or flow-tube experiments, recreate field
          observations, or evalute the effects of new chemistry on an existing
          system. MusicBox is designed to let you build the chemical system you
          want. You can simulate that system for the conditions you're
          interested in, and evalute the results.
        </p>
        <p className="lead hero-text">
          When you're ready, communicate your new chemical system to the
          community, so it can run in any
          <a href="#collaborators"> participating model</a>.
        </p>
        <p>
          <Link
            to="/getting_started"
            className="btn btn-primary btn-lg btn-ncar-active"
          >
            Get started »
          </Link>
        </p>
        <div className="warning-box">
          MusicBox is currently being tested. Please verify all simulation
          results independently.
        </div>
      </div>
    </div>
  );
}
