import React from "react";
import acom_small from "../../assets/ACOM_small.png";
import bsc_small from "../../assets/bsc_small.jpg";
import mdc from "../../assets/MDC.png";
import eu from "../../assets/EU.png";
import ui_small from "../../assets/UI_small.png";
import nsf from "../../assets/NSF.png";
import tamu from "../../assets/TAM-Logo.png";

export default function Collaborators() {
  return (
    <div id="collaborators" className="about-section">
      <div className="container">
        <div className="row">
          <div className="col-lg-8">
            <div className="container">
              <div className="row">
                <div className="col-lg-4 d-flex justify-content-center">
                  <a href="https://ncar.ucar.edu/">
                    <img
                      src={acom_small}
                      className="logo-small img-fluid"
                      alt="National Center for Atmospheric Research"
                    />
                  </a>
                </div>
                <div className="col-lg-8">
                  <p>
                    MusicBox is a component of the MUSICA project of the
                    National Center for Atmospheric Research's Atmospheric
                    Chemistry Observations and Modeling Laboratory. MUSICA – the
                    Multi-Scale Infrastructure for Chemistry and Aerosols – will
                    become a computationally feasible global modeling framework
                    that allows for the simulation of large-scale atmospheric
                    phenomena, while still resolving chemistry at emission and
                    exposure relevant scales (down to ~4 km within the next 5
                    years). The Model-Independent Chemistry Module (MICM) is
                    also developed at NCAR-ACOM and can bring MusicBox
                    mechanisms you develop here to high-performance weather and
                    climate models.
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-4 d-flex justify-content-center">
                  <a href="https://www.bsc.es/">
                    <img
                      src={bsc_small}
                      className="logo-small img-fluid"
                      alt="Barcelona Supercomputing Center"
                    />
                  </a>
                </div>
                <div className="col-lg-8">
                  <p>
                    MusicBox uses Chemistry Across Multiple Phases (CAMP) from
                    the Barcelona Supercomputing Center (BSC) Earth Sciences
                    Department. CAMP is being incorporated into BSC's Multiscale
                    Online Non-hydrostatic AtmospheRe CHemistry model (MONARCH)
                    model. This means mechanisms you develop in MusicBox can be
                    rapidly deployed to a global/regional chemical weather
                    prediction system.
                  </p>
                  <div className="container">
                    <div className="row">
                      <div className="col-lg-6">
                        <div className="d-flex justify-content-center">
                          <img
                            src={mdc}
                            className="logo-small img-fluid"
                            alt="Ministerio de Ciencia, Innovación y Universidades"
                          />
                        </div>
                        <div className="my-2">
                          <p>
                            <small>
                              Ministerio de Ciencia, Innovación y Universidades
                              as part of the BROWNING project
                              RTI2018-099894-B-I00
                            </small>
                          </p>
                        </div>
                      </div>
                      <div className="col-lg-6">
                        <div className="d-flex justify-content-center">
                          <img
                            src={eu}
                            className="logo-small img-fluid"
                            alt="European Union Horizon 2020"
                          />
                        </div>
                        <div className="my-2">
                          <p>
                            <small>
                              European Union’s Horizon 2020 research and
                              innovation programme under the Marie
                              Sklodowska-Curie grant agreement No 747048
                            </small>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-4 d-flex justify-content-center">
                  <a href="https://illinois.edu/">
                    <img
                      src={ui_small}
                      className="logo-small img-fluid"
                      alt="University of Illinois at Urbana Champaign"
                    />
                  </a>
                </div>
                <div className="col-lg-8">
                  <p>
                    Chemistry Across Multiple Phases (CAMP) is co-developed at
                    the Univesity of Illinois at Urbana&ndash;Champaign and is
                    used in the PartMC Particle-Resolved Monte Carlo model for
                    atmopsheric aerosol simulation. PartMC can use MusicBox
                    mechanisms to explore mixing-state effects of the
                    atmospheric system you are interested in.
                  </p>
                  <div className="container">
                    <div className="row">
                      <div className="col-lg-12">
                        <div className="d-flex justify-content-center">
                          <img
                            src={nsf}
                            className="logo-small img-fluid"
                            alt="National Science Foundation"
                          />
                        </div>
                        <div className="my-2">
                          <p>
                            <small>
                              National Science Foundation Award NSF-AGS 19-41110
                            </small>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-4 d-flex justify-content-center">
                  <a href="https://tamu.edu/">
                    <img
                      src={tamu}
                      className="logo-medium img-fluid"
                      alt="Texas A&M University"
                    />
                  </a>
                </div>
                <div className="col-lg-8">
                  <p>
                    MusicBox Interactive Desktop was developed at Texas A&M
                    University by a group of seniors for their capstone project.
                    The project was sponsored by the National Center for
                    Atmospheric Research. The goal of the project was to create
                    a desktop version of the MusicBox web application and
                    transition the Fortran box model to use Python and MICM.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <h1 className="about-heading">MusicBox Collaborators</h1>
            <div className="pt-4">
              <h4>
                MusicBox chooses its friends wisely. Our goal is to streamline
                the communication of chemical mechanisms from MusicBox to any
                collaborator model.
              </h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
