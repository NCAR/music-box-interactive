import { combineReducers } from "redux";
import { mechanismReducer } from "./mechanism";
import { conditionsReducer } from "./conditions";
import { resultsReducer } from "./results";
import { plotsReducer } from "./plots";
import { cookiesReducer } from "./cookies";
import { flowReducer } from "./flow";

export default combineReducers({
  mechanism: mechanismReducer,
  conditions: conditionsReducer,
  results: resultsReducer,
  plots: plotsReducer,
  cookies: cookiesReducer,
  flow: flowReducer,
});
