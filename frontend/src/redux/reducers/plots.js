import utils from "../utils";

const initialState = {
  species: {
    plots: [],
  },
  reactions: {
    plots: [],
  },
  environment: {
    plots: [],
  },
  aerosols: {
    plots: [],
  },
};

export const plotsReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.RESET_ALL: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.RESET_PLOTS: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.ADD_PLOT: {
      const type = action.payload.content.type;
      const plot = action.payload.content.plot;
      return {
        ...state,
        [type]: {
          ...state[type],
          plots: [...state[type].plots, plot],
        },
      };
    }
    case utils.action_types.REMOVE_PLOT: {
      const type = action.payload.content.type;
      const id = action.payload.content.id;
      return {
        ...state,
        [type]: {
          ...state[type],
          plots: [...state[type].plots.filter((plot) => plot.id !== id)],
        },
      };
    }
    case utils.action_types.UPDATE_PLOT_UNITS: {
      const type = action.payload.content.type;
      const units = action.payload.content.units;
      switch (type) {
        case "species":
        case "reactions": {
          return {
            ...state,
            [type]: {
              ...state[type],
              plots: state[type].plots.map((a) => ({ ...a, units: units })),
            },
          };
        }
        case "environment": {
          return state;
        }
        case "aerosols": {
          return state;
        }
      }
    }
    default:
      return state;
  }
};
