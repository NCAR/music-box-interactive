import React from "react";
import nsf from "../../assets/NSF.png";

export default function Sponsors() {
  return (
    <div id="sponsors" className="about-section">
      <div className="container">
        <h1 className="about-heading">Our Sponsor</h1>
        <h4 className="py-4">
          The National Science Foundation funds the MUSICA project
        </h4>
        <div className="container">
          <div className="row">
            <div className="col-lg-4">
              <div className="d-flex justify-content-center">
                <img
                  src={nsf}
                  className="logo-small img-fluid"
                  alt="National Science Foundation"
                />
              </div>
              <div className="my-2">
                <p>National Science Foundation Cooperative Agreement 1755088</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
