import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Form, ListGroup, Col, Row } from "react-bootstrap";
import {
  getLinks,
  getMechanism,
  getReactionDependencies,
  isSelectedSpecies,
  getResults,
  getIsFlowPlotLogScale,
  getFlowMaxArrowWidth,
  getFlowTimeRangeStartIndex,
  getFlowTimeRangeEndIndex,
  getResultTimes,
  getFlowLocalTimeRangeStart,
  getFlowLocalTimeRangeEnd,
  getFlowFluxRangeStart,
  getFlowFluxRangeEnd,
  getFlowLocalFluxRangeStart,
  getFlowLocalFluxRangeEnd,
  getNodes,
} from "../../redux/selectors";
import {
  selectFlowSpecies,
  deselectFlowSpecies,
  setIsFlowPlotLogScale,
  setFlowMaxArrowWidth,
  setFlowTimeRangeStartIndex,
  setFlowTimeRangeEndIndex,
  setFlowLocalTimeRangeStart,
  setFlowLocalTimeRangeEnd,
  setFlowFluxRangeStart,
  setFlowFluxRangeEnd,
  setFlowLocalFluxRangeStart,
  setFlowLocalFluxRangeEnd,
  setFlowIgnoredSpecies,
} from "../../redux/actions";
import MultiRangeSlider from "./MultiRangeSlider";

function FlowPanel(props) {
  const kFluxRangePoints = 10000;

  useEffect(() => {
    props.setTimeRangeStartIndex(0, props.reactions, props.results);
    props.setTimeRangeEndIndex(
      props.timeSteps.length - 1,
      props.reactions,
      props.results,
    );
  }, [props.timeSteps]);

  useEffect(() => {
    props.setFluxRangeStart(props.fluxMin);
    props.setFluxRangeEnd(props.fluxMax);
  }, [props.fluxMin, props.fluxMax]);

  return (
    <nav>
      <ListGroup
        className="bg-ncar-menu-secondary p-2 text-center"
        style={{ height: `100%` }}
      >
        <Form
          onSubmit={(e) => {
            e.disableDefault();
          }}
          id="flow-graph-config-panel"
        >
          <ListGroup.Item>
            <Form.Label htmlFor="flow-scale-select">
              Arrow Width Scaling:
            </Form.Label>
            <Form.Select
              value={props.isLogScale ? "log" : "linear"}
              onChange={(e) => {
                props.setIsLogScale(
                  !props.isLogScale,
                  props.reactions,
                  props.results,
                );
              }}
            >
              <option value="log">Log</option>
              <option value="linear">Linear</option>
            </Form.Select>
          </ListGroup.Item>
          <ListGroup.Item>
            <Form.Label htmlFor="flow-arrow-width-range">
              Max Arrow Width: {props.maxArrowWidth}
            </Form.Label>
            <Form.Range
              min="1"
              max="15"
              value={props.maxArrowWidth}
              onChange={(e) => {
                props.setMaxArrowWidth(
                  e.target.value,
                  props.reactions,
                  props.results,
                );
              }}
            />
          </ListGroup.Item>
          <ListGroup.Item>
            <Form.Label htmlFor="flow-time-range">Time Range [s]</Form.Label>
            <Row>
              <Col>
                <Form.Control
                  type="text"
                  step="any"
                  value={props.localTimeRangeStart}
                  onChange={(e) => {
                    props.setLocalTimeRangeStart(e.target.value);
                  }}
                  onBlur={(e) => {
                    const startIndex = props.timeSteps.reduce(
                      (result, val, idx, arr) => {
                        return Math.abs(val - props.localTimeRangeStart) <
                          Math.abs(arr[result] - props.localTimeRangeStart)
                          ? idx
                          : result;
                      },
                    );
                    if (startIndex > props.timeRangeEndIndex) {
                      props.setTimeRangeEndIndex(
                        startIndex,
                        props.reactions,
                        props.results,
                      );
                    }
                    props.setTimeRangeStartIndex(
                      startIndex,
                      props.reactions,
                      props.results,
                    );
                  }}
                />
              </Col>
              <Col xs={2}>to</Col>
              <Col>
                <Form.Control
                  type="text"
                  step="any"
                  value={props.localTimeRangeEnd}
                  onChange={(e) => {
                    props.setLocalTimeRangeEnd(e.target.value);
                  }}
                  onBlur={(e) => {
                    const endIndex = props.timeSteps.reduce(
                      (result, val, idx, arr) => {
                        return Math.abs(val - props.localTimeRangeEnd) <
                          Math.abs(arr[result] - props.localTimeRangeEnd)
                          ? idx
                          : result;
                      },
                    );
                    if (endIndex < props.timeRangeStartIndex) {
                      props.setTimeRangeStartIndex(
                        endIndex,
                        props.reactions,
                        props.results,
                      );
                    }
                    props.setTimeRangeEndIndex(
                      endIndex,
                      props.reactions,
                      props.results,
                    );
                  }}
                />
              </Col>
            </Row>
            <Row>
              <MultiRangeSlider
                values={props.timeSteps}
                minIndex={props.timeRangeStartIndex}
                maxIndex={props.timeRangeEndIndex}
                onChange={({ minIndex, maxIndex }) => {
                  if (minIndex != props.timeRangeStartIndex) {
                    props.setTimeRangeStartIndex(
                      minIndex,
                      props.reactions,
                      props.results,
                    );
                  }
                  if (maxIndex != props.timeRangeEndIndex) {
                    props.setTimeRangeEndIndex(
                      maxIndex,
                      props.reactions,
                      props.results,
                    );
                  }
                }}
              />
            </Row>
          </ListGroup.Item>
          <ListGroup.Item>
            <Form.Label htmlFor="flow-flux-range">
              Flux Range [mol m-3]
            </Form.Label>
            <Row>
              <Col>
                <Form.Control
                  type="text"
                  step="any"
                  value={props.localFluxRangeStart}
                  onChange={(e) => {
                    props.setLocalFluxRangeStart(e.target.value);
                  }}
                  onBlur={(e) => {
                    if (props.fluxRangeStart != props.localFluxRangeStart) {
                      props.setFluxRangeStart(props.localFluxRangeStart);
                    }
                  }}
                />
              </Col>
              <Col xs={2}>to</Col>
              <Col>
                <Form.Control
                  type="text"
                  step="any"
                  value={props.localFluxRangeEnd}
                  onChange={(e) => {
                    props.setLocalFluxRangeEnd(e.target.value);
                  }}
                  onBlur={(e) => {
                    if (props.fluxRangeEnd != props.localFluxRangeEnd) {
                      props.setFluxRangeEnd(props.localFluxRangeEnd);
                    }
                  }}
                />
              </Col>
            </Row>
            <Row>
              <MultiRangeSlider
                values={props.fluxValues}
                minIndex={props.fluxRangeStartIndex}
                maxIndex={props.fluxRangeEndIndex}
                onChange={({ minIndex, maxIndex }) => {
                  if (minIndex != props.fluxRangeStartIndex) {
                    props.setFluxRangeStart(props.fluxValues[minIndex]);
                  }
                  if (maxIndex != props.fluxRangeEndIndex) {
                    props.setFluxRangeEnd(props.fluxValues[maxIndex]);
                  }
                }}
              />
            </Row>
          </ListGroup.Item>
          <ListGroup.Item>
            Select species:
            <ListGroup
              className="species-list"
              key="species-select-list-group"
              style={{
                overflowY: "auto",
                maxHeight: "300px",
              }}
            >
              {props.species?.map((elem, index) => {
                const spec = props.activeUnselectedSpecies.find(
                  (e) => e.name == elem.name,
                );
                const variant = spec ? "primary" : null;
                return (
                  <ListGroup.Item
                    as="button"
                    action
                    variant={variant}
                    // style={{backgroundColor: "azure"}}
                    className="modal-bg"
                    key={index}
                    active={elem.isSelected}
                    name={elem.name}
                    value={elem.name}
                    id={elem.name}
                    onClick={(e) => {
                      e.preventDefault(); // prevents this list item from changing the URL to add a query parameter with this element's name which would cause a re-render
                      elem.isSelected
                        ? props.deselectSpecies(
                            elem.name,
                            props.reactions,
                            props.results,
                          )
                        : props.selectSpecies(
                            elem.name,
                            props.reactions,
                            props.results,
                          );
                    }}
                  >
                    <span className="species-select-list-item">
                      {elem.name}
                    </span>
                    {spec && (
                      <span
                        style={{
                          position: "absolute",
                          right: "5%",
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "0.80rem",
                          color: "red",
                        }}
                        className="oi oi-x"
                        toggle="tooltip"
                        aria-hidden="true"
                        onClick={(e) => {
                          e.stopPropagation(); // prevents the click handler defined above from firing
                          e.preventDefault(); // prevents the x from triggering the action that adds the element to the url as a query parameter
                          props.setFlowIgnoredSpecies(
                            elem.name,
                            props.reactions,
                            props.results,
                          );
                        }}
                        title="Remove species from flow diagram"
                      />
                    )}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </ListGroup.Item>
        </Form>
      </ListGroup>
    </nav>
  );
}

const mapStateToProps = (state) => {
  const isLogScale = getIsFlowPlotLogScale(state);
  const timeSteps = getResultTimes(state);
  const localTimeStart = getFlowLocalTimeRangeStart(state);
  const localTimeEnd = getFlowLocalTimeRangeEnd(state);
  const startTimeIndex = getFlowTimeRangeStartIndex(state);
  const endTimeIndex = getFlowTimeRangeEndIndex(state);
  const startTime = timeSteps[startTimeIndex];
  const endTime = timeSteps[endTimeIndex];
  const links = getLinks(state);
  const species = getMechanism(state).gasSpecies.map((species) => {
    return {
      ...species,
      isSelected: isSelectedSpecies(state, species.name),
    };
  });
  const activeUnselectedSpecies = getNodes(state)
    .filter((elem) => elem.className === "species")
    .filter((elem) => !species.find((e) => e.name === elem.name).isSelected);
  const fluxMin = Math.min(...links.map((link) => link.flux));
  const fluxMax = Math.max(...links.map((link) => link.flux));
  let fluxValues = isLogScale
    ? Array.from({ length: 1000 }, (val, idx) =>
        Math.exp(
          ((Math.log(fluxMax) - Math.log(Math.max(fluxMin, 1.0e-60))) / 1000) *
            idx +
            Math.log(Math.max(fluxMin, 1.0e-60)),
        ),
      )
    : Array.from(
        { length: 1000 },
        (val, idx) => fluxMin + ((fluxMax - fluxMin) / 1000) * idx,
      );
  fluxValues[0] = fluxMin;
  fluxValues[fluxValues.length - 1] = fluxMax;
  let fluxRangeStart = getFlowFluxRangeStart(state);
  fluxRangeStart = fluxRangeStart
    ? fluxRangeStart < fluxMin
      ? fluxMin
      : fluxRangeStart > fluxMax
        ? fluxMax
        : fluxRangeStart
    : fluxMin;
  let fluxRangeEnd = getFlowFluxRangeEnd(state);
  fluxRangeEnd = fluxRangeEnd
    ? fluxRangeEnd < fluxRangeStart
      ? fluxRangeStart
      : fluxRangeEnd > fluxMax
        ? fluxMax
        : fluxRangeEnd
    : fluxMax;
  return {
    species: species,
    activeUnselectedSpecies: activeUnselectedSpecies,
    reactions: getReactionDependencies(state),
    results: getResults(state),
    isLogScale: isLogScale,
    maxArrowWidth: getFlowMaxArrowWidth(state),
    timeSteps: timeSteps,
    timeRangeStartIndex: startTimeIndex,
    timeRangeEndIndex: endTimeIndex,
    localTimeRangeStart: localTimeStart
      ? localTimeStart
      : startTime
        ? startTime
        : 0,
    localTimeRangeEnd: localTimeEnd ? localTimeEnd : endTime ? endTime : 0,
    fluxMin: fluxValues[0],
    fluxMax: fluxValues[fluxValues.length - 1],
    fluxValues: fluxValues,
    fluxRangeStartIndex: fluxValues.reduce((result, val, idx, arr) => {
      return Math.abs(val - fluxRangeStart) <
        Math.abs(arr[result] - fluxRangeStart)
        ? idx
        : result;
    }, 0),
    fluxRangeEndIndex: fluxValues.reduce((result, val, idx, arr) => {
      return Math.abs(val - fluxRangeEnd) < Math.abs(arr[result] - fluxRangeEnd)
        ? idx
        : result;
    }, 0),
    fluxRangeStart: fluxRangeStart,
    fluxRangeEnd: fluxRangeEnd,
    localFluxRangeStart: getFlowLocalFluxRangeStart(state),
    localFluxRangeEnd: getFlowLocalFluxRangeEnd(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    selectSpecies: (species, dependencies, results) =>
      dispatch(selectFlowSpecies({ species, dependencies, results })),
    deselectSpecies: (species, dependencies, results) =>
      dispatch(deselectFlowSpecies({ species, dependencies, results })),
    setIsLogScale: (isLogScale, dependencies, results) =>
      dispatch(setIsFlowPlotLogScale({ isLogScale, dependencies, results })),
    setMaxArrowWidth: (maxArrowWidth, dependencies, results) =>
      dispatch(setFlowMaxArrowWidth({ maxArrowWidth, dependencies, results })),
    setTimeRangeStartIndex: (timeIndex, dependencies, results) =>
      dispatch(
        setFlowTimeRangeStartIndex({ timeIndex, dependencies, results }),
      ),
    setTimeRangeEndIndex: (timeIndex, dependencies, results) =>
      dispatch(setFlowTimeRangeEndIndex({ timeIndex, dependencies, results })),
    setLocalTimeRangeStart: (time) =>
      dispatch(setFlowLocalTimeRangeStart({ time })),
    setLocalTimeRangeEnd: (time) =>
      dispatch(setFlowLocalTimeRangeEnd({ time })),
    setFluxRangeStart: (flux) => dispatch(setFlowFluxRangeStart({ flux })),
    setFluxRangeEnd: (flux) => dispatch(setFlowFluxRangeEnd({ flux })),
    setLocalFluxRangeStart: (flux) =>
      dispatch(setFlowLocalFluxRangeStart({ flux })),
    setLocalFluxRangeEnd: (flux) =>
      dispatch(setFlowLocalFluxRangeEnd({ flux })),
    setFlowIgnoredSpecies: (species, dependencies, results) =>
      dispatch(setFlowIgnoredSpecies({ species, dependencies, results })),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(FlowPanel);
