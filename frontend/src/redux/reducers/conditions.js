import utils from "../utils";
import { v4 as uuidv4 } from "uuid";

const initialState = {
  basic: {
    chemistry_time_step: 1.0,
    chemistry_time_step_units: "sec",
    output_time_step: 1.0,
    output_time_step_units: "sec",
    simulation_time: 100.0,
    simulation_time_units: "sec",
  },
  initial_species_concentrations: [],
  initial_environmental: [
    {
      id: uuidv4(),
      name: "temperature",
      value: 298.15,
      units: "K",
    },
    {
      id: uuidv4(),
      name: "pressure",
      value: 101325.0,
      units: "Pa",
    },
  ],
  initial_reactions: [],
  evolving: {
    times: [0.0],
    values: [],
  },
  model_components: [
    {
      type: "CAMP",
      "configuration file": "camp_data/config.json",
      "override species": {
        M: { "mixing ratio mol mol-1": 1.0 },
      },
      "suppress output": {
        M: {},
      },
    },
  ],
};

const sortConditionsById = (a, b) => {
  if (a.id < b.id) {
    return -1;
  } else if (a.id > b.id) {
    return 1;
  } else {
    return 0;
  }
};

export const conditionsReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.RESET_ALL: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.UPDATE_BASIC_CONFIGURATION: {
      return {
        ...state,
        basic: action.payload.content.data,
      };
    }
    case utils.action_types.ADD_CONDITION: {
      const schema = action.payload.content.schema;
      const condition = action.payload.content.condition || {
        reactionId: null,
        value: 0,
        units: "",
        name: "",
        suffix: "",
      };
      const conditionId = condition.id || uuidv4();
      const otherConditions = state[schema.classKey].filter((condition) => {
        return condition.id !== conditionId;
      });
      return {
        ...state,
        [schema.classKey]: [
          ...otherConditions,
          {
            ...condition,
            id: conditionId,
          },
        ].sort(sortConditionsById),
      };
    }
    case utils.action_types.REMOVE_CONDITION: {
      const schema = action.payload.content.schema;
      const ids = action.payload.content.conditionIds;
      const otherConditions = state[schema.classKey].filter((condition) => {
        return !ids.includes(condition.id);
      });

      return {
        ...state,
        [schema.classKey]: [...otherConditions],
      };
    }
    case utils.action_types.REMOVE_REACTION: {
      const reactionId = action.payload.content;
      return {
        ...state,
        initial_reactions: state.initial_reactions.filter(
          (condition) => condition.reactionId !== reactionId,
        ),
      };
    }
    case utils.action_types.UPDATE_EVOLVING_CONDITIONS: {
      return {
        ...state,
        evolving: { ...action.payload.content },
      };
    }
    case utils.action_types.UPDATE_EVOLVING_TIME: {
      const timeIndex = action.payload.content.timeIndex;
      const value = action.payload.content.value;
      return {
        ...state,
        evolving: {
          ...state.evolving,
          times: [
            ...state.evolving.times.slice(0, timeIndex),
            value,
            ...state.evolving.times.slice(timeIndex + 1),
          ],
        },
      };
    }
    case utils.action_types.UPDATE_EVOLVING_CONDITION_VALUE: {
      const timeIndex = action.payload.content.timeIndex;
      const conditionName = action.payload.content.conditionName;
      const value = action.payload.content.value;
      return {
        ...state,
        evolving: {
          ...state.evolving,
          values: [
            ...state.evolving.values.map((condition, index) =>
              condition.name !== conditionName
                ? condition
                : {
                    ...condition,
                    values: [
                      ...condition.values.slice(0, timeIndex),
                      value,
                      ...condition.values.slice(timeIndex + 1),
                    ],
                  },
            ),
          ],
        },
      };
    }
    case utils.action_types.RESORT_EVOLVING_CONDITIONS: {
      const compareTime = (a, b) =>
        a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
      const sortOrder = state.evolving.times
        .map((time, index) => {
          return { time: parseFloat(time), index: index };
        })
        .sort(compareTime)
        .map(({ index }) => index);
      return {
        ...state,
        evolving: {
          ...state.evolving,
          times: state.evolving.times.map((_, index) =>
            parseFloat(state.evolving.times[sortOrder[index]]),
          ),
          values: state.evolving.values.map((condition) => {
            return {
              ...condition,
              values: condition.values.map((_, index) =>
                parseFloat(condition.values[sortOrder[index]]),
              ),
            };
          }),
        },
      };
    }
    case utils.action_types.ADD_EVOLVING_CONDITION: {
      const condition = action.payload.content.condition;
      return {
        ...state,
        evolving: {
          ...state.evolving,
          values: [
            ...state.evolving.values,
            {
              ...condition,
              values: [...state.evolving.times.map(() => 0)],
            },
          ],
        },
      };
    }
    case utils.action_types.ADD_EVOLVING_TIME: {
      return {
        ...state,
        evolving: {
          ...state.evolving,
          times: [
            ...state.evolving.times,
            state.evolving.times.length > 0
              ? Math.max(...state.evolving.times) + 1
              : 0,
          ],
          values: [
            ...state.evolving.values.map((value) => {
              return {
                ...value,
                values: [...value.values, 0],
              };
            }),
          ],
        },
      };
    }
    case utils.action_types.REMOVE_EVOLVING_CONDITION: {
      const conditionIndex = action.payload.content.conditionIndex;
      return {
        ...state,
        evolving: {
          ...state.evolving,
          values: [
            ...state.evolving.values.slice(0, conditionIndex),
            ...state.evolving.values.slice(conditionIndex + 1),
          ],
        },
      };
    }
    case utils.action_types.REMOVE_EVOLVING_TIME: {
      const timeIndex = action.payload.content.timeIndex;
      return {
        ...state,
        evolving: {
          ...state.evolving,
          times: [
            ...state.evolving.times.slice(0, timeIndex),
            ...state.evolving.times.slice(timeIndex + 1),
          ],
          values: [
            ...state.evolving.values.map((value) => {
              return {
                ...value,
                values: [
                  ...value.values.slice(0, timeIndex),
                  ...value.values.slice(timeIndex + 1),
                ],
              };
            }),
          ],
        },
      };
    }
    case utils.action_types.LOAD_EVOLVING_CONDITIONS_TABLE: {
      const table = action.payload.content.table;
      const possibleConditions = action.payload.content.possibleConditions;
      return {
        ...state,
        evolving: {
          times: [...table.slice(1).map((row) => row[0])],
          values: [
            ...table[0].slice(1).map((name, colIndex) => {
              return {
                ...possibleConditions.filter((condition) => {
                  return condition.tableName === name;
                })[0],
                values: [...table.slice(1).map((row) => row[colIndex + 1])],
              };
            }),
          ],
        },
      };
    }
    case utils.action_types.EXAMPLE_FETCHED: {
      return {
        ...state,
        ...action.payload.conditions,
      };
    }
    default:
      return state;
  }
};
