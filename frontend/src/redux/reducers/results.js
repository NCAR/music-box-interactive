import utils from "../utils";
import { RunStatus } from "../../controllers/models";

const initialState = {
  runStatus: RunStatus.WAITING,
  error: {
    message:
      "Your ship has sunk. If you try to get help from the dolphin, go to page 34.",
  },
  data: {
    times: [],
    temperature: [],
    pressure: [],
    air_density: [],
    species: [],
    integrated_rates: {},
    // partmc data
    partMCTimes: [],
    mass_concentration: [],
    number_concentration: [],
  },
};

export const resultsReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.RESET_ALL: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.UPDATE_RUN_STATUS: {
      return {
        ...state,
        runStatus: action.payload.content.status,
        error: action.payload.content.error,
      };
    }
    case utils.action_types.RESULTS_LOADED: {
      const data = action.payload.content;

      // get the integrated reaction rates
      const irr_keys = Object.keys(data).filter((key) => key.includes("irr__"));
      const irr_data = {};
      irr_keys.forEach((key) => {
        irr_data[key.substring(10)] = data[key]; // trims `CONC.irr__`
      });

      // get the species concentrations
      const concentration_keys = Object.keys(data).filter(
        (key) => key.includes("CONC.") && !key.includes("irr__"),
      );
      const concentrations = [];
      concentration_keys.forEach((key) => {
        concentrations.push({
          name: key.substring(5),
          concentration: data[key],
        });
      });

      return {
        ...state,
        data: {
          times: data.time,
          pressure: data["ENV.pressure"],
          temperature: data["ENV.temperature"],
          air_density: data["ENV.number_density_air"],
          integrated_rates: irr_data,
          species: concentrations,
          partMCTimes: data?.partmc?.time,
          mass_concentration: data?.partmc?.number_conc,
          number_concentration: data?.partmc?.mass_conc,
        },
      };
    }
    default:
      return state;
  }
};
