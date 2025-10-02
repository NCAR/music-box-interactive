import utils from "../utils";

export const selectFlowSpecies = (content) => {
  return {
    type: utils.action_types.SELECT_FLOW_SPECIES,
    payload: { content },
  };
};

export const deselectFlowSpecies = (content) => {
  return {
    type: utils.action_types.DESELECT_FLOW_SPECIES,
    payload: { content },
  };
};

export const setIsFlowPlotLogScale = (content) => {
  return {
    type: utils.action_types.SET_IS_FLOW_PLOT_LOG_SCALE,
    payload: { content },
  };
};

export const setFlowMaxArrowWidth = (content) => {
  return {
    type: utils.action_types.SET_FLOW_MAX_ARROW_WIDTH,
    payload: { content },
  };
};

export const setFlowTimeRangeStartIndex = (content) => {
  return {
    type: utils.action_types.SET_FLOW_TIME_RANGE_START_INDEX,
    payload: { content },
  };
};

export const setFlowTimeRangeEndIndex = (content) => {
  return {
    type: utils.action_types.SET_FLOW_TIME_RANGE_END_INDEX,
    payload: { content },
  };
};

export const setFlowLocalTimeRangeStart = (content) => {
  return {
    type: utils.action_types.SET_FLOW_LOCAL_TIME_RANGE_START,
    payload: { content },
  };
};

export const setFlowLocalTimeRangeEnd = (content) => {
  return {
    type: utils.action_types.SET_FLOW_LOCAL_TIME_RANGE_END,
    payload: { content },
  };
};

export const setFlowFluxRangeStart = (content) => {
  return {
    type: utils.action_types.SET_FLOW_FLUX_RANGE_START,
    payload: { content },
  };
};

export const setFlowFluxRangeEnd = (content) => {
  return {
    type: utils.action_types.SET_FLOW_FLUX_RANGE_END,
    payload: { content },
  };
};

export const setFlowLocalFluxRangeStart = (content) => {
  return {
    type: utils.action_types.SET_FLOW_LOCAL_FLUX_RANGE_START,
    payload: { content },
  };
};

export const setFlowLocalFluxRangeEnd = (content) => {
  return {
    type: utils.action_types.SET_FLOW_LOCAL_FLUX_RANGE_END,
    payload: { content },
  };
};

export const setFlowIgnoredSpecies = (content) => {
  return {
    type: utils.action_types.SET_FLOW_IGNORED_SPECIES,
    payload: { content },
  };
};
