import React from "react";
import ReactDOM from "react-dom/client";
import Home from "./pages";
import GettingStarted from "./pages/getting_started";
import Mechanism from "./pages/mechanism";
import Conditions from "./pages/conditions";
import Results from "./pages/results";
import Plots from "./pages/plots";
import NetworkGraph from "./pages/d3_flow";
import Download from "./pages/downloads";
import PreviousResults from "./pages/previous_results";
import { Provider } from "react-redux";
import { store, persistor } from "./redux/store/createStore";
import { MathJaxContext } from "better-react-mathjax";
import { HelmetProvider } from "react-helmet-async";
import { PersistGate } from "redux-persist/integration/react";
import isElectron from "is-electron";
import "./styles/global.css";

import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  createHashRouter,
} from "react-router-dom";

const RedirectToRoot = () => <Navigate to="/" />;
const featureFlags = JSON.parse(import.meta.env.VITE_FEATURE_FLAGS || "{}");

let routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/home",
    element: <RedirectToRoot />,
  },
  {
    path: "/getting_started",
    element: <GettingStarted />,
  },
  {
    path: "/mechanism",
    element: <Mechanism />,
  },
  {
    path: "/conditions",
    element: <Conditions />,
  },
  {
    path: "/results",
    element: <Results />,
  },
  {
    path: "/plots",
    element: <Plots />,
  },
  {
    path: "/downloads",
    element: <Download />,
  },
];

if (featureFlags.FLOW_DIAGRAM) {
  routes.push({
    path: "/flow_diagram",
    element: <NetworkGraph />,
  });
}

if (isElectron()) {
  routes.push({
    path: "/previous_results",
    element: <PreviousResults />,
  });
}

const router = isElectron()
  ? createHashRouter(routes)
  : createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <MathJaxContext>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <RouterProvider router={router} />
          </PersistGate>
        </Provider>
      </MathJaxContext>
    </HelmetProvider>
  </React.StrictMode>,
);
