import utils from "../utils";
export * from "./conditions";
export * from "./examples";
export * from "./mechanism";
export * from "./run";
export * from "./plots";
export * from "./cookies";
export * from "./flow.js";

export const resetAll = (content) => {
  return {
    type: utils.action_types.RESET_ALL,
    payload: {},
  };
};

export const resetPlots = (content) => {
  return {
    type: utils.action_types.RESET_PLOTS,
    payload: {},
  };
};
