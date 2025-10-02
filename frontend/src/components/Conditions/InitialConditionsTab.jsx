import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import ConditionTable from "./ConditionTable";
import {
  getConditions,
  getUserDefinedRatesIds,
  getVariableSpeciesNames,
} from "../../redux/selectors";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Stack from "@mui/material/Stack";
import { ThemeProvider } from "@mui/material";
import theme from "../../theme";

const initialConditionsSchema = {
  speciesConcentrations: {
    label: "Species Concentrations",
    nameLabel: "Species name",
    classKey: "initial_species_concentrations",
    allowAddRemove: true,
    units: [
      "mol mol-1",
      "ppth",
      "ppm",
      "ppb",
      "ppt",
      "mol m-3",
      "mol cm-3",
      "molec m-3",
      "molec cm-3",
    ],
  },
  environmentalConditions: {
    label: "Environmental Conditions",
    nameLabel: "Property",
    classKey: "initial_environmental",
    allowAddRemove: false,
    units: {
      temperature: ["K", "C", "F"],
      pressure: ["Pa", "atm", "bar", "kPa", "hPa", "mbar"],
    },
  },
  reactionConditions: {
    label: "Reaction Rates and Rate Constants",
    nameLabel: "Reaction label",
    classKey: "initial_reactions",
    allowAddRemove: true,
    extraColumns: [{ key: "type", label: "Type" }],
  },
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

function InitialConditionsTab(props) {
  const [value, setValue] = useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  // watch for changes so that the table updates whenever the redux store updates
  useEffect(() => {}, [props.data]);

  return (
    <ThemeProvider theme={theme}>
      <Stack spacing={2} sx={{ margin: `2%` }}>
        <p className="lead-muted p-2">
          Initial environmental conditions, concentrations for chemical species,
          and reaction rates/rate constants that have a MUSICA name can be set
          here. The conditions you set here will remain at the value you specify
          until updated by the solver (as is the case for chemical species
          concentrations) or overwritten by evolving conditions you specify.
        </p>
        <Tabs value={value} onChange={handleChange}>
          <Tab label="Species Concentrations" value={0}></Tab>
          <Tab label="Environmental Conditions" value={1}></Tab>
          <Tab label="Reaction Conditions" value={2}></Tab>
        </Tabs>
        <TabPanel value={value} index={0}>
          <ConditionTable
            title="Species Concentrations"
            data={props.data.speciesConditons.existing}
            availableNames={props.data.speciesConditons.missing}
            getUnits={() => [
              null,
              ...initialConditionsSchema.speciesConcentrations.units,
            ]}
            schema={initialConditionsSchema.speciesConcentrations}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ConditionTable
            title="Envionmental Concentrations"
            data={props.data.environmentalConditions}
            getUnits={(condition) =>
              initialConditionsSchema.environmentalConditions.units[
                condition.name
              ]
            }
            schema={initialConditionsSchema.environmentalConditions}
          />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <ConditionTable
            title="Reaction Conditions"
            data={props.data.reactionConditions.existing}
            availableNames={props.data.reactionConditions.missing}
            getUnits={(condition) => condition.possibleUnits}
            schema={initialConditionsSchema.reactionConditions}
            nameIdMap={props.data.reactionConditions.nameIdMap}
          />
        </TabPanel>
      </Stack>
    </ThemeProvider>
  );
}

const mapStateToProps = (state, ownProps) => {
  const existingSpeciesConditions = getConditions(
    state,
    initialConditionsSchema.speciesConcentrations,
  );
  const possibleNames = getVariableSpeciesNames(state);
  const speciesNames = possibleNames.filter(
    (name) =>
      !existingSpeciesConditions.find((condition) => condition.name === name),
  );

  const environmentalConditions = getConditions(
    state,
    initialConditionsSchema.environmentalConditions,
  );

  const reactionConditions = getConditions(
    state,
    initialConditionsSchema.reactionConditions,
  );
  const possibleReactions = getUserDefinedRatesIds(state);
  const nameIdMap = possibleReactions.reduce((acc, val) => {
    acc[`${val.name}${val.suffix}`] = {
      reactionId: val.id,
      suffix: val.suffix,
      type: val.type,
    };
    return acc;
  }, {});
  const availableReactionConditions = possibleReactions.reduce((acc, val) => {
    let found = reactionConditions.find(
      (condition) =>
        val.id === condition.reactionId &&
        `${val.name}${val.suffix}` === condition.name,
    );
    if (!found) {
      acc.push(`${val.name}${val.suffix}`);
    }
    return acc;
  }, []);

  return {
    data: {
      speciesConditons: {
        existing: existingSpeciesConditions,
        missing: speciesNames,
      },
      environmentalConditions,
      reactionConditions: {
        existing: reactionConditions,
        missing: availableReactionConditions,
        nameIdMap,
      },
    },
  };
};

export default connect(mapStateToProps)(InitialConditionsTab);
