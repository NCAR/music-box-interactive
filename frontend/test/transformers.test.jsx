import {
  translate_to_camp_config,
  extract_mechanism_from_example,
} from "../src/controllers/transformers";
import { expect, test } from "vitest";
import { store } from "../src/redux/store/createStore";
import { getMechanism } from "../src/redux/selectors/mechanism";
import { reactionSchema } from "../src/redux/schemas/mechanism.js";
import { afterEach } from "vitest";
import { ReactionTypes } from "../src/controllers/models.js";

import { addGasSpecies, addReaction } from "../src/redux/actions";

afterEach(async () => {
  // reset the store so that each test is independent
  await store.dispatch({ type: "RESET_ALL" });
});

test("Test Reaction Stoichiometry Consistency: Reactants", async () => {
  await store.dispatch(addGasSpecies({ name: "HO2", properties: [] }));
  await store.dispatch(addGasSpecies({ name: "O2", properties: [] }));
  await store.dispatch(addGasSpecies({ name: "H2O2", properties: [] }));

  // add a reaction with HO2 + HO2 -> H2O2 + O2
  // two species of HO2 but distinctly added
  let arrhenius = JSON.parse(JSON.stringify(reactionSchema.arrhenius));
  arrhenius.data.reactants = [
    { name: "HO2", qty: 1 },
    { name: "HO2", qty: 1 },
  ];
  arrhenius.data.products = [
    { name: "H2O2", yield: 1 },
    { name: "O2", yield: 1 },
  ];
  await store.dispatch(addReaction(arrhenius));

  // add a reaction with 2HO2 -> H2O2 + O2
  // two species of HO2 but this time with a stoichiometric coefficient of 2
  let arrhenius2 = JSON.parse(JSON.stringify(reactionSchema.arrhenius));
  arrhenius2.data.reactants = [{ name: "HO2", qty: 2 }];
  arrhenius2.data.products = [
    { name: "H2O2", yield: 1 },
    { name: "O2", yield: 1 },
  ];

  await store.dispatch(addReaction(arrhenius2));

  // now make sure that when we translate this that the two reactions have the same stoichiometry
  const result = translate_to_camp_config(getMechanism(store.getState()));
  const reactions = result.reactions["camp-data"][0].reactions;
  const first_reaction = reactions[0];
  const second_reaction = reactions[1];

  expect(first_reaction.reactants).toEqual(second_reaction.reactants);
});

test("Test Reaction Stoichiometry Consistency: Products", async () => {
  await store.dispatch(addGasSpecies({ name: "A", properties: [] }));
  await store.dispatch(addGasSpecies({ name: "B", properties: [] }));

  // add a reaction with A -> B + B
  // two species of B but distinctly added
  let arrhenius = JSON.parse(JSON.stringify(reactionSchema.arrhenius));
  arrhenius.data.reactants = [{ name: "A", qty: 1 }];
  arrhenius.data.products = [
    { name: "B", yield: 1 },
    { name: "B", yield: 1 },
  ];
  await store.dispatch(addReaction(arrhenius));

  // add a reaction with A -> 2B
  // two species of B but this time with a stoichiometric coefficient of 2
  let arrhenius2 = JSON.parse(JSON.stringify(reactionSchema.arrhenius));
  arrhenius2.data.reactants = [{ name: "A", qty: 1 }];
  arrhenius2.data.products = [{ name: "B", yield: 2 }];

  await store.dispatch(addReaction(arrhenius2));

  // now make sure that when we translate this that the two reactions have the same stoichiometry
  const result = translate_to_camp_config(getMechanism(store.getState()));
  const reactions = result.reactions["camp-data"][0].reactions;
  const first_reaction = reactions[0];
  const second_reaction = reactions[1];

  expect(first_reaction.products.B.yield).toEqual(
    second_reaction.products.B.yield,
  );
});

test("Test Surface Reaction is Translated Correctly", async () => {
  await store.dispatch(
    addGasSpecies({
      name: "A",
      properties: [
        { name: "diffusion coeff [m^2 s-1]", value: 2.0 },
        { name: "molecular weight [kg mol-1]", value: 1.0 },
      ],
    }),
  );
  await store.dispatch(addGasSpecies({ name: "B", properties: [] }));
  await store.dispatch(addGasSpecies({ name: "C", properties: [] }));

  let surface_reaction = JSON.parse(
    JSON.stringify(reactionSchema.surfaceReaction),
  );
  expect(surface_reaction.data).toBeDefined();
  expect(surface_reaction.data.gas_phase_reactant).toBeNull();
  expect(surface_reaction.data.products).toBeDefined();
  expect(surface_reaction.data.products.length).toEqual(0);
  expect(surface_reaction.data.reaction_probability).toEqual(1.0);
  expect(surface_reaction.data.musica_name).toEqual("");

  surface_reaction.data.gas_phase_reactant = "A";
  surface_reaction.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  surface_reaction.data.reaction_probability = 0.3;
  surface_reaction.data.musica_name = "test_surface_reaction";
  await store.dispatch(addReaction(surface_reaction));

  const result = translate_to_camp_config(getMechanism(store.getState()));
  const reactions = result.reactions["camp-data"][0].reactions;
  const reaction = reactions[0];

  expect(reaction.type).toEqual("SURFACE");
  expect(reaction.reaction_probability).toEqual(0.3);
  expect(reaction.musica_name).toEqual("test_surface_reaction");
  expect(reaction["gas-phase reactant"]).toBeDefined();
  expect(reaction["gas-phase reactant"]["A"]).toBeDefined();
  expect(reaction["gas-phase reactant"]["A"]["qty"]).toBeDefined();
  expect(reaction["gas-phase reactant"]["A"]["qty"]).toEqual(1);

  expect(reaction["gas-phase products"]).toBeDefined();
  expect(reaction["gas-phase products"]["B"]).toBeDefined();
  expect(reaction["gas-phase products"]["B"]["yield"]).toBeDefined();
  expect(reaction["gas-phase products"]["B"]["yield"]).toEqual(1);
  expect(reaction["gas-phase products"]["C"]).toBeDefined();
  expect(reaction["gas-phase products"]["C"]["yield"]).toBeDefined();
  expect(reaction["gas-phase products"]["C"]["yield"]).toEqual(1);
});

test("Test Surface Reaction is Extracted From Configuration Correctly", async () => {
  const config = {
    conditions: {
      "box model options": {
        grid: "box",
        "chemistry time step [min]": 1,
        "output time step [sec]": 200,
        "simulation length [day]": 5,
      },
      "chemical species": {
        A: {
          "initial value [mol m-3]": 1.0,
        },
      },
      "environmental conditions": {
        temperature: {
          "initial value [K]": 206.6374207,
        },
        pressure: {
          "initial value [Pa]": 6152.049805,
        },
      },
      "evolving conditions": {},
      "model components": [
        {
          type: "CAMP",
          "configuration file": "camp_data/config.json",
          "override species": {
            M: {
              "mixing ratio mol mol-1": 1,
            },
          },
          "suppress output": {
            M: {},
          },
        },
      ],
    },
    mechanism: {
      species: {
        "camp-data": [
          {
            name: "M",
            type: "CHEM_SPEC",
            "tracer type": "CONSTANT",
            description:
              "Third-body molecule. This is any molecule present in the system.",
          },
          {
            name: "A",
            type: "CHEM_SPEC",
            "absolute tolerance": 1e-12,
            "molecular weight [kg mol-1]": 1.0,
            "diffusion coeff [m^2 s-1]": 2.0,
          },
          {
            name: "B",
            type: "CHEM_SPEC",
            "absolute tolerance": 1e-12,
          },
          {
            name: "C",
            type: "CHEM_SPEC",
            "absolute tolerance": 1e-12,
          },
        ],
      },
      reactions: {
        "camp-data": [
          {
            name: "Chapman",
            type: "MECHANISM",
            reactions: [
              {
                type: "SURFACE",
                "gas-phase reactant": "A",
                "reaction probability": 0.3,
                "musica name": "test_surface_reaction",
                "gas-phase products": {
                  B: {},
                  C: {},
                },
              },
            ],
          },
        ],
      },
    },
  };

  const result = extract_mechanism_from_example(config);
  expect(result).toBeDefined();
  expect(result.reactions).toBeDefined();
  expect(result.reactions.length).toEqual(1);
  expect(result.reactions[0].data).toBeDefined();
  expect(result.reactions[0].data.type).toEqual("SURFACE");
  expect(result.reactions[0].data.gas_phase_reactant).toBeDefined();
  expect(result.reactions[0].data.gas_phase_reactant).toEqual("A");
  expect(result.reactions[0].data.products).toBeDefined();
  expect(result.reactions[0].data.products.length).toEqual(2);
  expect(result.reactions[0].data.products[0].name).toEqual("B");
  expect(result.reactions[0].data.products[1].name).toEqual("C");
  expect(result.reactions[0].data.reaction_probability).toEqual(0.3);
  expect(result.reactions[0].data.musica_name).toEqual("test_surface_reaction");
});

test("Test Surface Reaction is Properly Stringified", async () => {});
