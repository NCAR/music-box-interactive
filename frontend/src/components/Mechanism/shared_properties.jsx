const options = [
  {
    displayName: "description",
    name: "description",
    dataType: "string",
    value: "",
  },
  {
    displayName: "absolute convergence tolerance",
    name: "absolute convergence tolerance [mol mol-1]",
    dataType: "number",
    value: 1e-12,
  },
  {
    displayName: "molecular weight",
    name: "molecular weight [kg mol-1]",
    dataType: "number",
    value: 0,
  },
  {
    displayName: "fixed concentration",
    name: "fixed concentration",
    dataType: "string",
    value: "CONSTANT",
  },
  {
    displayName: "diffusion coefficient",
    name: "diffusion coeff [m^2 s-1]",
    dataType: "number",
    value: 0,
  },
];

const aerosol_options = [
  ...options,
  {
    displayName: "density",
    name: "density",
    dataType: "number",
    value: 0,
  },
  {
    displayName: "kappa",
    name: "kappa",
    dataType: "number",
    value: 0,
  },
];

export { options as gas_options, aerosol_options };
