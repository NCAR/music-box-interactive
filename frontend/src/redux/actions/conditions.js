import utils from "../utils";

export const updateBasicConfiguration = (content) => {
  return {
    type: utils.action_types.UPDATE_BASIC_CONFIGURATION,
    payload: { content },
  };
};

export const addCondition = (content) => {
  return {
    type: utils.action_types.ADD_CONDITION,
    payload: { content },
  };
};

export const removeConditions = (content) => {
  return {
    type: utils.action_types.REMOVE_CONDITION,
    payload: { content },
  };
};

export const updateEvolvingConditions = (content) => {
  return {
    type: utils.action_types.UPDATE_EVOLVING_CONDITIONS,
    payload: { content },
  };
};

export const updateEvolvingTime = (content) => {
  return {
    type: utils.action_types.UPDATE_EVOLVING_TIME,
    payload: { content },
  };
};

export const updateEvolvingConditionValue = (content) => {
  return {
    type: utils.action_types.UPDATE_EVOLVING_CONDITION_VALUE,
    payload: { content },
  };
};

export const resortEvolvingConditions = (content) => {
  return {
    type: utils.action_types.RESORT_EVOLVING_CONDITIONS,
    payload: { content },
  };
};

export const addEvolvingCondition = (content) => {
  return {
    type: utils.action_types.ADD_EVOLVING_CONDITION,
    payload: { content },
  };
};

export const addEvolvingTime = (content) => {
  return {
    type: utils.action_types.ADD_EVOLVING_TIME,
    payload: { content },
  };
};

export const removeEvolvingCondition = (content) => {
  return {
    type: utils.action_types.REMOVE_EVOLVING_CONDITION,
    payload: { content },
  };
};

export const removeEvolvingTime = (content) => {
  return {
    type: utils.action_types.REMOVE_EVOLVING_TIME,
    payload: { content },
  };
};

export const loadEvolvingConditionsTable = (content) => {
  return {
    type: utils.action_types.LOAD_EVOLVING_CONDITIONS_TABLE,
    payload: { content },
  };
};
