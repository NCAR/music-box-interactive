export const basicConfigSchema = [
  {
    type: "FLOAT",
    label: "Chemistry time step",
    key: "chemistry_time_step",
    units: {
      values: ["sec", "min", "hour", "day"],
      key: "chemistry_time_step_units",
    },
  },
  {
    type: "FLOAT",
    label: "Output time step",
    key: "output_time_step",
    units: {
      values: ["sec", "min", "hour", "day"],
      key: "output_time_step_units",
    },
  },
  {
    type: "FLOAT",
    label: "Simulation time",
    key: "simulation_time",
    units: {
      values: ["sec", "min", "hour", "day"],
      key: "simulation_time_units",
    },
  },
];
