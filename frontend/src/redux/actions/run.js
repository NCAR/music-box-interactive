import utils from "../utils";
import { run } from "../../controllers/api";
import {
  translate_to_camp_config,
  translate_to_musicbox_conditions,
  translate_aerosol,
} from "../../controllers/transformers";
import isElectron from "is-electron";
import { RunStatus } from "../../controllers/models";

export const doRun = (mechanism, conditions) => async (dispatch) => {
  try {
    const camp_mechanism = translate_to_camp_config(mechanism);
    const musicbox_conditions = translate_to_musicbox_conditions(
      conditions,
      mechanism,
    );
    const aerosol = translate_aerosol(mechanism);

    if (isElectron()) {
      const script = "print_config.py";

      const args = {
        mechanism: camp_mechanism,
        conditions: musicbox_conditions,
      };

      //output from python solver
      const boxModelOutput = await window.electron.doRun(script, args);

      const content = {
        status: RunStatus["DONE"],
        error: {},
      };
      dispatch({
        type: utils.action_types.UPDATE_RUN_STATUS,
        payload: { content },
      });

      dispatch({
        type: utils.action_types.RESULTS_LOADED,
        payload: { content: boxModelOutput },
      });
    } else {
      await run({
        mechanism: camp_mechanism,
        conditions: musicbox_conditions,
        aerosols: aerosol,
      });
      dispatch({ type: utils.action_types.START_POLLING, payload: {} });
    }
  } catch (error) {
    console.error(`Error starting run: ${error.message}`);
  }
};
