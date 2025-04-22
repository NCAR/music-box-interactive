import React from "react";
import logo from "../assets/NSF-NCAR_Lockup-UCAR-Light_102523.png";
import { Navbar, Nav } from "react-bootstrap";
import * as styles from "../styles/layout.module.css";
import { Helmet } from "react-helmet-async";
import { useDispatch, connect } from "react-redux";
import { NavLink } from "react-router-dom";
import { doRun, resetPlots } from "../redux/actions";
import { hideCookieBanner } from "../redux/actions";
import {
  getMechanism,
  getAllConditions,
  getEvolvingTable,
  getRunStatus,
  getShowCookieBanner,
} from "../redux/selectors";
import { RunStatus } from "../controllers/models";
import utils from "../redux/utils";
import { useNavigate } from "react-router-dom";
import { useVeiwPort } from "../hooks/useVeiwPort";
import ScrollToAnchor from "./ScrollToAnchor";
import isElectron from "is-electron";
import { Link } from "react-router-dom";
import GitHubIcon from "@mui/icons-material/GitHub";

function Layout(props) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // you can change breakPoint aligned with your design
  const { isOpen: menuIsOpen, setIsOpen: setMenuIsOpen } = useVeiwPort({
    breakPoint: 836,
  });

  const featureFlags = JSON.parse(import.meta.env.VITE_FEATURE_FLAGS || "{}");

  const handleClick = () => {
    if (props.runStatus !== RunStatus.RUNNING) {
      const content = {
        status: RunStatus.WAITING,
        error: "",
      };
      dispatch(resetPlots());
      dispatch({
        type: utils.action_types.UPDATE_RUN_STATUS,
        payload: { content },
      });
      dispatch(doRun(props.mechanism, props.conditions));
      navigate("/results");
    }
  };

  const title = isElectron()
    ? `MusicBox ${import.meta.env.VITE_APP_VERSION}`
    : `MusicBox ${process.env.VITE_APP_VERSION}`;

  return (
    <>
      <Helmet>
        <title>{props.title || title}</title>
      </Helmet>
      <ScrollToAnchor />
      <div className={styles.dashboard}>
        <Navbar
          className="shadow p-0 sticky-top flex-md-nowrap"
          bg="dark"
          variant="dark"
        >
          <Navbar.Brand className="navbar-brand col-md-3 col-lg-2 me-0 px-3">
            <Link to="/" className="text-white text-decoration-none">
              {title}
            </Link>
          </Navbar.Brand>
        </Navbar>
        <div className={styles.content}>
          <button
            className={`${styles.asideBtn} ${menuIsOpen ? styles.active : ""}`}
            onClick={() => setMenuIsOpen(!menuIsOpen)}
          >
            {menuIsOpen ? "<<" : ">>"}
          </button>
          <div className={`${styles.menu} ${menuIsOpen ? styles.active : ""}`}>
            <Nav className="flex-column pt-3">
              <small className="nav-section">SETUP</small>
              <NavLink
                to="/getting_started"
                className={({ isActive }) =>
                  ["nav-link", isActive ? "active" : ""].join(" ")
                }
              >
                <span className="oi oi-signpost oi-prefix"></span>
                Start Here
              </NavLink>
              <NavLink
                to="/mechanism"
                className={({ isActive }) =>
                  ["nav-link", isActive ? "active" : ""].join(" ")
                }
              >
                <span className="oi oi-random oi-prefix"></span>
                Mechanism
              </NavLink>
              <NavLink
                to="/conditions"
                className={({ isActive }) =>
                  ["nav-link", isActive ? "active" : ""].join(" ")
                }
              >
                <span className="oi oi-dashboard oi-prefix"></span>
                Conditions
              </NavLink>
              <div
                className="pt-1 pb-3 mx-0 my-2"
                style={{
                  borderTop: "1px solid gray",
                  borderBottom: "1px solid gray",
                }}
              >
                <small className="nav-section">RUN</small>
                <div style={{ textAlign: "center" }}>
                  <button
                    id="run-model"
                    style={{ margin: "auto" }}
                    className="btn btn-primary btn-ncar-active"
                    onClick={handleClick}
                  >
                    Run Model
                  </button>
                </div>
              </div>
              <small className="nav-section">ANALYSIS</small>
              <NavLink
                to="/plots"
                className={({ isActive }) =>
                  ["nav-link", isActive ? "active" : ""].join(" ")
                }
              >
                <span className="oi oi-graph oi-prefix"></span>
                Plot Results
              </NavLink>
              {featureFlags.FLOW_DIAGRAM && (
                <>
                  <NavLink
                    to="/flow_diagram"
                    className={({ isActive }) =>
                      ["nav-link", isActive ? "active" : ""].join(" ")
                    }
                  >
                    <span className="oi oi-fork oi-prefix"></span>
                    Flow Diagram
                  </NavLink>
                </>
              )}
              <NavLink
                to="/downloads"
                className={({ isActive }) =>
                  ["nav-link", isActive ? "active" : ""].join(" ")
                }
              >
                <span className="oi oi-data-transfer-download oi-prefix"></span>
                Download
              </NavLink>
              {isElectron() && (
                <NavLink
                  to="/previous_results"
                  className={({ isActive }) =>
                    ["nav-link", isActive ? "active" : ""].join(" ")
                  }
                >
                  <span className="oi oi-bar-chart oi-prefix"></span>
                  Previous Results
                </NavLink>
              )}
            </Nav>
            <div className="mt-auto mb-4">
              <img id="logo" className="img-fluid p-2" alt="" src={logo} />
            </div>
          </div>
          <div className={styles.main}>
            {props.children}
            <div className={styles.footer}>
              <div className="row justify-content-around">
                <div className="col-md offset-md-1">
                  <Link className="footer-link" to="/#behind-the-music">
                    <h5>About</h5>
                  </Link>
                  <ul className="list-unstyled text-small">
                    <Link className="footer-link" to="/#collaborators">
                      <li>Collaborators</li>
                    </Link>
                    <Link className="footer-link" to="/#sponsors">
                      <li>Sponsors</li>
                    </Link>
                    <Link className="footer-link" to="/#contact">
                      <li>Contact us</li>
                    </Link>
                    <Link
                      className="footer-link"
                      to="https://www.ucar.edu/accessibility"
                    >
                      <li>Accessibility</li>
                    </Link>
                  </ul>
                </div>
                <div className="col-md">
                  <Link
                    className="footer-link"
                    to="/getting_started#how-to-use"
                  >
                    <h5>How to use</h5>
                  </Link>
                </div>
                <div className="col-md d-flex justify-content-center">
                  <a
                    className="footer-link"
                    style={{ marginRight: "8px" }}
                    href="https://github.com/NCAR/music-box-interactive-client/issues/new?template=bug_report.md"
                  >
                    <h5>Report a bug</h5>
                  </a>
                  <a
                    className="footer-link"
                    href="https://github.com/NCAR/music-box-interactive-client"
                  >
                    <GitHubIcon style={{ width: "24px", height: "24px" }} />
                  </a>
                </div>
              </div>
            </div>
            {props.cookieBannerVisible && (
              <div className={styles.consentBanner}>
                <p>
                  UCAR uses cookies to make our website function; however, UCAR
                  cookies do not collect personal information about you. When
                  using our website, you may encounter embedded content, such as
                  YouTube videos and other social media links, that use their
                  own cookies. To learn more about third-party cookies on this
                  website, and to set your cookie preferences,&nbsp;
                  <a
                    href="https://www.ucar.edu/cookie-other-tracking-technologies-notice"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    click here
                  </a>
                  .
                </p>
                <button onClick={props.hideCookieBanner}>Accept</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const mapStateToProps = (state) => {
  const mechanism = { ...getMechanism(state) };
  const conditions = { ...getAllConditions(state) };
  const evolving = getEvolvingTable(state);
  conditions.evolving = evolving;
  return {
    mechanism: mechanism,
    conditions: conditions,
    runStatus: getRunStatus(state),
    cookieBannerVisible: getShowCookieBanner(state),
  };
};

export default connect(mapStateToProps, { hideCookieBanner })(Layout);
