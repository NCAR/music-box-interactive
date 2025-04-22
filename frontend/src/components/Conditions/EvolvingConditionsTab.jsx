import React from "react";
import { connect } from "react-redux";
import EvolvingConditionsDetail from "./EvolvingConditionsDetail";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material";
import theme from "../../theme";

function EvolvingConditionsTab(props) {
  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ margin: `2%` }}>
        <p className="lead-muted p-2">
          Load files containing model conditions that change during the
          simulation. These can be environmental conditions, chemical species
          concentrations, or rates/rate constants for reactions with a MUSICA
          name. Evolving conditions take precedence over initial conditions.
        </p>
        <div className="container-fluid">
          <div className="row m-2">
            <div className="col p-0">
              <EvolvingConditionsDetail />
            </div>
          </div>
        </div>
      </Stack>
    </ThemeProvider>
  );
}

export default connect()(EvolvingConditionsTab);
