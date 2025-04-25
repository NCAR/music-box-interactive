import utils from "../utils";
import { checkRunStatus, loadResults } from "../../controllers/api";
import { RunStatus } from "../../controllers/models";

const pollingMiddleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action) => {
    next(action);

    if (action.type === utils.action_types.START_POLLING) {
      const poll = async () => {
        try {
          // Make a new web request to check the status of the original request
          const response = await checkRunStatus();
          const content = {
            status: RunStatus[response.data.status],
            error: response.data.error,
          };
          dispatch({
            type: utils.action_types.UPDATE_RUN_STATUS,
            payload: { content },
          });

          // If the simulation is still running, keep polling
          if (
            content.status === RunStatus.RUNNING ||
            content.status === RunStatus.WAITING
          ) {
            setTimeout(poll, 1000); // Poll every second
          } else if (content.status === RunStatus.DONE) {
            const results = await loadResults();
            dispatch({
              type: utils.action_types.RESULTS_LOADED,
              payload: { content: results.data },
            });
          }
        } catch (error) {
          // Handle errors here
          const content = {
            status: "ERROR",
            error: {
              message: "Internal server error.",
            },
          };
          dispatch({
            type: utils.action_types.UPDATE_RUN_STATUS,
            payload: { content },
          });
          console.error(error);
        }
      };

      poll();
    }
  };

export default pollingMiddleware;
