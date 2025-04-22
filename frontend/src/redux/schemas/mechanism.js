import { ReactionTypes } from "../../controllers/models";

export const reactionSchema = {
  arrhenius: {
    data: {
      type: ReactionTypes.ARRHENIUS,
      A: 1.0,
      Ea: 0.0,
      B: 0.0,
      D: 300.0,
      E: 0.0,
      reactants: [],
      products: [],
    },
    typeLabel: "Arrhenius",
    elements: [
      {
        type: "REACTANT_LIST",
        key: "reactants",
        label: "reactants",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "products",
      },
      {
        type: "EQUATION",
        value: "\\(k = Ae^{(\\frac{-E_a}{k_bT})}(\\frac{T}{D})^B(1.0+E*P)\\)",
        description:
          "k<sub>B</sub>: Boltzmann constant (J K<sup>-1</sup>); T: temperature (K); P: pressure (Pa)",
      },
      {
        type: "FLOAT",
        key: "A",
        label: "A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "Ea",
        label: "Ea",
        units: "J",
      },
      {
        type: "FLOAT",
        key: "B",
        label: "B",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "D",
        label: "D",
        units: "K",
      },
      {
        type: "FLOAT",
        key: "E",
        label: "E",
        units: "Pa<sup>-1</sup>",
      },
    ],
  },
  emission: {
    data: {
      type: ReactionTypes.EMISSION,
      species: undefined,
      scaling_factor: 1.0,
      musica_name: "",
    },
    typeLabel: "Emission",
    isUserDefined: true,
    tablePrefix: "EMIS",
    possibleUnits: ["mol m-3 s-1"],
    elements: [
      {
        type: "SPECIES",
        key: "species",
        label: "species",
      },
      {
        type: "FLOAT",
        key: "scaling_factor",
        label: "scaling factor",
        units: "unitless",
      },
      {
        type: "DESCRIPTION",
        text:
          "Use the scaling factor to adjust emission rates from input data. " +
          "A scaling factor of 1.0 results in no adjustment.",
      },
      {
        type: "STRING",
        key: "musica_name",
        label: "MUSICA name",
      },
      {
        type: "DESCRIPTION",
        text:
          "Set a MUSICA name for this reaction to identify it in other parts " +
          "of the model (e.g., input conditions). You may choose any name you like.",
      },
    ],
  },
  firstOrderLoss: {
    data: {
      type: ReactionTypes.FIRST_ORDER_LOSS,
      species: undefined,
      scaling_factor: 1.0,
      musica_name: "",
    },
    typeLabel: "First-Order Loss",
    isUserDefined: true,
    tablePrefix: "LOSS",
    possibleUnits: ["s-1"],
    elements: [
      {
        type: "SPECIES",
        key: "species",
        label: "species",
      },
      {
        type: "FLOAT",
        key: "scaling_factor",
        label: "scaling factor",
        units: "unitless",
      },
      {
        type: "DESCRIPTION",
        text:
          "Use the scaling factor to adjust first order loss rates from input data. " +
          "A scaling factor of 1.0 results in no adjustment.",
      },
      {
        type: "STRING",
        key: "musica_name",
        label: "MUSICA name",
      },
      {
        type: "DESCRIPTION",
        text:
          "Set a MUSICA name for this reaction to identify it in other parts " +
          "of the model (e.g., input conditions). You may choose any name you like.",
      },
    ],
  },
  photolysis: {
    data: {
      type: ReactionTypes.PHOTOLYSIS,
      reactant: undefined,
      products: [],
      scaling_factor: 1.0,
      musica_name: "",
    },
    typeLabel: "Photolysis",
    isUserDefined: true,
    tablePrefix: "PHOT",
    possibleUnits: ["s-1"],
    elements: [
      {
        type: "SPECIES",
        key: "reactant",
        label: "reactant",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "products",
      },
      {
        type: "FLOAT",
        key: "scaling_factor",
        label: "scaling factor",
        units: "unitless",
      },
      {
        type: "DESCRIPTION",
        text:
          "Use the scaling factor to adjust photolysis rates from input data. " +
          "A scaling factor of 1.0 results in no adjustment.",
      },
      {
        type: "STRING",
        key: "musica_name",
        label: "MUSICA name",
      },
      {
        type: "DESCRIPTION",
        text:
          "Set a MUSICA name for this reaction to identify it in other parts " +
          "of the model (e.g., input conditions). You may choose any name you like.",
      },
    ],
  },
  ternaryChemicalActivation: {
    data: {
      type: ReactionTypes.TERNARY_CHEMICAL_ACTIVATION,
      k0_A: 1.0,
      k0_B: 0.0,
      k0_C: 0.0,
      kinf_A: 1.0,
      kinf_B: 0.0,
      kinf_C: 0.0,
      Fc: 0.6,
      N: 1.0,
      reactants: [],
      products: [],
    },
    typeLabel: "Ternary Chemical Activation",
    elements: [
      {
        type: "REACTANT_LIST",
        key: "reactants",
        label: "reactants",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "products",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_0 = k_{0A}e^{(\\frac{k_{0C}}{T})}(\\frac{T}{300.0})^{k_{0B}}\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_{inf} = k_{infA}e^{(\\frac{k_{infC}}{T})}(\\frac{T}{300.0})^{k_{infB}}\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(k = \\frac{k_0}{1+k_0[\\mbox{M}]/k_{\\inf}}F_C^{(1+1/N[log_{10}(k_0[\\mbox{M}]/k_{\\inf})]^2)^{-1}}\\)",
        description:
          "T: temperature (K); M: number density of air (# cm<sup>-3</sup>)",
      },
      {
        type: "FLOAT",
        key: "k0_A",
        label: "k0_A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "k0_B",
        label: "k0_B",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "k0_C",
        label: "k0_C",
        units: "K<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "kinf_A",
        label: "kinf_A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "kinf_B",
        label: "kinf_B",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "kinf_C",
        label: "kinf_C",
        units: "K<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "Fc",
        label: "Fc",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "N",
        label: "N",
        units: "unitless",
      },
    ],
  },
  troe: {
    data: {
      type: ReactionTypes.TROE,
      k0_A: 1.0,
      k0_B: 0.0,
      k0_C: 0.0,
      kinf_A: 1.0,
      kinf_B: 0.0,
      kinf_C: 0.0,
      Fc: 0.6,
      N: 1.0,
      reactants: [],
      products: [],
    },
    typeLabel: "Troe (Fall-Off)",
    elements: [
      {
        type: "REACTANT_LIST",
        key: "reactants",
        label: "reactants",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "products",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_0 = k_{0A}e^{(\\frac{k_{0C}}{T})}(\\frac{T}{300.0})^{k_{0B}}\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_{inf} = k_{infA}e^{(\\frac{k_{infC}}{T})}(\\frac{T}{300.0})^{k_{infB}}\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(k = \\frac{k_0[\\mbox{M}]}{1+k_0[\\mbox{M}]/k_{\\inf}}F_C^{(1+1/N[log_{10}(k_0[\\mbox{M}]/k_{\\inf})]^2)^{-1}}\\)",
        description:
          "T: temperature (K); M: number density of air (# cm<sup>-3</sup>)",
      },
      {
        type: "FLOAT",
        key: "k0_A",
        label: "k0_A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "k0_B",
        label: "k0_B",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "k0_C",
        label: "k0_C",
        units: "K",
      },
      {
        type: "FLOAT",
        key: "kinf_A",
        label: "kinf_A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "kinf_B",
        label: "kinf_B",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "kinf_C",
        label: "kinf_C",
        units: "K",
      },
      {
        type: "FLOAT",
        key: "Fc",
        label: "Fc",
        units: "unitless",
      },
      {
        type: "FLOAT",
        key: "N",
        label: "N",
        units: "unitless",
      },
    ],
  },
  branched: {
    data: {
      type: ReactionTypes.WENNBERG_NO_RO2,
      X: 1.0,
      Y: 0.0,
      a0: 1.0,
      n: 0,
      reactants: [],
      primary_products: [],
      secondary_products: [],
    },
    typeLabel: "Branched",
    elements: [
      {
        type: "REACTANT_LIST",
        key: "reactants",
        label: "reactants",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "primary_products",
        label: "first branch products",
      },
      {
        type: "PRODUCT_LIST",
        key: "secondary_products",
        label: "second branch products",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_{firstBranch} = \\left(X e^{-Y/T}\\right) \\left(\\frac{A(T, \\mbox{[M]}, n)}{A(T, \\mbox{[M]}, n) + Z}\\right)\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_{secondBranch} = \\left(X e^{-Y/T}\\right)\\left(\\frac{Z}{Z + A(T, \\mbox{[M]}, n)}\\right)\\)",
      },
      {
        type: "EQUATION",
        value:
          "\\(A(T, \\mbox{[M]}, n) = \\frac{2 \\times 10^{-22} e^n \\mbox{[M]}}{1 + \\frac{2 \\times 10^{-22} e^n \\mbox{[M]}}{0.43(T/298)^{-8}}} 0.41^{(1+[log( \\frac{2 \\times 10^{-22} e^n \\mbox{[M]}}{0.43(T/298)^{-8}})]^2)^{-1}}\\)",
        description:
          "Typically used for NO + RO2 -> alkoxy radical + NO2 reactions, " +
          "T is temperature (K), [M] is the number density of air " +
          "(molecules cm<sup>-3</sup>), X and Y are Arrhenius " +
          "parameters for the overall reaction, n is the number of heavy " +
          "atoms in the RO2 reacting species (excluding the peroxy " +
          "moiety), and Z is defined as a function of two parameters " +
          "(alpha_0, n):",
      },
      {
        type: "EQUATION",
        value:
          "\\(Z( \\alpha_0, n) = A(T = 293 \\mbox{K}, \\mbox{[M]} = 2.45 \\times 10^{19} \\frac{\\mbox{molec}}{\\mbox{cm}^3}, n) \\frac{(1-\\alpha_0)}{\\alpha_0}\\)",
        description: "More details can be found in Wennberg et al. (2018).",
      },
      {
        type: "FLOAT",
        key: "X",
        label: "X",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "Y",
        label: "Y",
        units: "K",
      },
      {
        type: "FLOAT",
        key: "a0",
        label: "a0",
        units: "unitless",
      },
      {
        type: "INT",
        key: "n",
        label: "n",
        units: "unitless",
      },
    ],
  },
  tunneling: {
    data: {
      type: ReactionTypes.WENNBERG_TUNNELING,
      A: 1.0,
      B: 0.0,
      C: 0.0,
      reactants: [],
      products: [],
    },
    typeLabel: "Tunneling",
    elements: [
      {
        type: "REACTANT_LIST",
        key: "reactants",
        label: "reactants",
      },
      {
        type: "DESCRIPTION",
        text: "Use the 'qty' property when a species appears more than once as a reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "products",
      },
      {
        type: "EQUATION",
        value: "\\(Ae^{(\\frac{-B}{T})}e^{(\\frac{C}{T^3})}\\)",
        description:
          "A is the pre-exponential factor " +
          "((# cm<sup>-3</sup>)<sup>-(n-1)</sup>s<sup>-1</sup>), " +
          "and B and C are parameters that capture the temperature " +
          "dependence as described in Wennberg et al. (2018).",
      },
      {
        type: "FLOAT",
        key: "A",
        label: "A",
        units: "(# cm<sup>-3</sup>)<sup>-(n-1)</sup> s<sup>-1</sup>",
      },
      {
        type: "FLOAT",
        key: "B",
        label: "B",
        units: "K",
      },
      {
        type: "FLOAT",
        key: "C",
        label: "C",
        units: "K<sup>3</sup>",
      },
    ],
  },
  surfaceReaction: {
    data: {
      type: ReactionTypes.SURFACE_REACTION,
      gas_phase_reactant: null,
      products: [],
      reaction_probability: 1.0,
      musica_name: "",
    },
    typeLabel: "Surface Reaction",
    isUserDefined: true,
    tablePrefix: "SURF",
    possibleUnits: ["s-1"],
    elements: [
      {
        type: "SPECIES",
        key: "gas_phase_reactant",
        label: "Gas phase reactant",
      },
      {
        type: "PRODUCT_LIST",
        key: "products",
        label: "Gas-phase products",
      },
      {
        type: "FLOAT",
        key: "reaction_probability",
        label: "reaction probability",
        units: "unitless",
      },
      {
        type: "EQUATION",
        value:
          "\\(k_{surface} = \\frac{4N_a \\pi r_e^2}{ \\left(\\frac{r_e}{D_g} + \\frac{4}{v(T)\\gamma}\\right) }\\)",
        description:
          "N<sub>a</sub>: number concentration of particles (particles m<sup>3</sup>); r<sub>e</sub>: effective particle radius (m); D<sub>g</sub>: gas-phase diffusion coefficient of the reactant (m<sup>2</sup>s<sup>-1</sup>); v: mean free speed of the gas-phase reactant, see below; gamma: reaction probability (unitless)",
      },
      {
        type: "EQUATION",
        value: "\\(v = \\sqrt{\\frac{8RT}{\\pi MW}}\\)",
        description:
          "R: ideal gas constant (J K<sup>-1</sup> mol<sup>-1</sup>); T: temperature (K); MW: molecular weight of the gas-phase reactant (kg mol<sup>-1</sup>)",
      },
      {
        type: "STRING",
        key: "musica_name",
        label: "MUSICA name",
      },
      {
        type: "DESCRIPTION",
        text:
          "Set a MUSICA name for this reaction to identify it in other parts " +
          "of the model (e.g., input conditions). You may choose any name you like.",
      },
    ],
  },
};
