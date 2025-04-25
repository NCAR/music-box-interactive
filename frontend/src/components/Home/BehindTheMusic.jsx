import React from "react";

export default function BehindTheMusic() {
  return (
    <div id="behind-the-music" className="about-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-6" style={{ paddingTop: "100px" }}>
            <h1 className="about-heading">Behind the Music</h1>
            <div className="pt-4">
              <h4>
                MusicBox leverages several state-of-the-art technologies to
                solve aspects of the atmospheric system.
              </h4>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="container">
              <div className="row">
                <div className="col-lg-4">
                  <h3 className="about-heading">CAMP</h3>
                </div>
                <div className="col-lg-8">
                  <p>
                    Chemistry Across Multiple Phases (CAMP) is a run-time
                    configured chemical system solver for gas- and
                    condensed-phase reactions and mass transfer associated with
                    the condensation and evaporation of gases to and from
                    aerosol particles and cloud droplets. It is designed to work
                    with a variety of aerosol representations (modes, bins,
                    single particles). CAMP is a product of the Barcelona
                    Supercomputing Center (BSC) and the University of Illinois
                    at Urbana&ndash;Champaign.
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-4">
                  <h3 className="about-heading">MICM</h3>
                </div>
                <div className="col-lg-8">
                  <p>
                    The Model-Independent Chemistry Module (MICM) is a chemical
                    system solver designed to bring flexibility for chemical
                    systems to high-performance weather and climate models. MICM
                    is developed at the National Center for Atmospheric Research
                    (NCAR).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
