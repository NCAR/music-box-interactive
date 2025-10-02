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

test("Test Reaction Short Names", async () => {
  let default_surface = JSON.parse(
    JSON.stringify(reactionSchema.surfaceReaction),
  );
  expect(ReactionTypes.shortName(default_surface)).toEqual("<none> -> <none>");
  default_surface.data.gas_phase_reactant = "A";
  expect(ReactionTypes.shortName(default_surface)).toEqual("A -> <none>");
  default_surface.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_surface)).toEqual("A -> B");
  default_surface.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_surface)).toEqual("A -> B + C");
  default_surface.data.gas_phase_reactant = null;
  expect(ReactionTypes.shortName(default_surface)).toEqual("<none> -> B + C");

  let default_arrhenius = JSON.parse(JSON.stringify(reactionSchema.arrhenius));
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual(
    "<none> -> <none>",
  );
  default_arrhenius.data.reactants = [{ name: "A", qty: 1 }];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("A -> <none>");
  default_arrhenius.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("A -> B");
  default_arrhenius.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("A -> B + C");
  default_arrhenius.data.reactants = [];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("<none> -> B + C");
  default_arrhenius.data.reactants = [{ name: "A", qty: 2 }];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("2A -> B + C");
  default_arrhenius.data.reactants = [
    { name: "A", qty: 2 },
    { name: "D", qty: 1 },
  ];
  expect(ReactionTypes.shortName(default_arrhenius)).toEqual("2A + D -> B + C");

  let default_emission = JSON.parse(JSON.stringify(reactionSchema.emission));
  expect(ReactionTypes.shortName(default_emission)).toEqual("<none> -> <none>");
  default_emission.data.species = "A";
  expect(ReactionTypes.shortName(default_emission)).toEqual("<none> -> A");
  default_emission.data.species = "B";
  expect(ReactionTypes.shortName(default_emission)).toEqual("<none> -> B");

  let default_first_order_loss = JSON.parse(
    JSON.stringify(reactionSchema.firstOrderLoss),
  );
  expect(ReactionTypes.shortName(default_first_order_loss)).toEqual(
    "<none> -> <none>",
  );
  default_first_order_loss.data.species = "A";
  expect(ReactionTypes.shortName(default_first_order_loss)).toEqual(
    "A -> <none>",
  );
  default_first_order_loss.data.species = "B";
  expect(ReactionTypes.shortName(default_first_order_loss)).toEqual(
    "B -> <none>",
  );

  let default_photolysis = JSON.parse(
    JSON.stringify(reactionSchema.photolysis),
  );
  expect(ReactionTypes.shortName(default_photolysis)).toEqual(
    "<none> -> <none>",
  );
  default_photolysis.data.reactant = "A";
  expect(ReactionTypes.shortName(default_photolysis)).toEqual("A -> <none>");
  default_photolysis.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_photolysis)).toEqual("A -> B");
  default_photolysis.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_photolysis)).toEqual("A -> B + C");
  default_photolysis.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 2 },
  ];
  expect(ReactionTypes.shortName(default_photolysis)).toEqual("A -> B + 2C");

  let default_troe = JSON.parse(JSON.stringify(reactionSchema.troe));
  expect(ReactionTypes.shortName(default_troe)).toEqual("<none> -> <none>");
  default_troe.data.reactants = [{ name: "A", qty: 1 }];
  expect(ReactionTypes.shortName(default_troe)).toEqual("A -> <none>");
  default_troe.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_troe)).toEqual("A -> B");
  default_troe.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_troe)).toEqual("A -> B + C");
  default_troe.data.reactants = [];
  expect(ReactionTypes.shortName(default_troe)).toEqual("<none> -> B + C");
  default_troe.data.reactants = [{ name: "A", qty: 2 }];
  expect(ReactionTypes.shortName(default_troe)).toEqual("2A -> B + C");
  default_troe.data.reactants = [
    { name: "A", qty: 2 },
    { name: "D", qty: 1 },
  ];
  expect(ReactionTypes.shortName(default_troe)).toEqual("2A + D -> B + C");

  let default_ternary_chemical_activation = JSON.parse(
    JSON.stringify(reactionSchema.ternaryChemicalActivation),
  );
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "<none> -> <none>",
  );
  default_ternary_chemical_activation.data.reactants = [{ name: "A", qty: 1 }];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "A -> <none>",
  );
  default_ternary_chemical_activation.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "A -> B",
  );
  default_ternary_chemical_activation.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "A -> B + C",
  );
  default_ternary_chemical_activation.data.reactants = [];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "<none> -> B + C",
  );
  default_ternary_chemical_activation.data.reactants = [{ name: "A", qty: 2 }];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "2A -> B + C",
  );
  default_ternary_chemical_activation.data.reactants = [
    { name: "A", qty: 2 },
    { name: "D", qty: 1 },
  ];
  expect(ReactionTypes.shortName(default_ternary_chemical_activation)).toEqual(
    "2A + D -> B + C",
  );

  let default_branched = JSON.parse(JSON.stringify(reactionSchema.branched));
  expect(ReactionTypes.shortName(default_branched)).toEqual("<none> -> <none>");
  default_branched.data.reactants = [{ name: "A", qty: 1 }];
  expect(ReactionTypes.shortName(default_branched)).toEqual("A -> <none>");
  default_branched.data.primary_products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_branched)).toEqual("A -> B");
  default_branched.data.primary_products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_branched)).toEqual("A -> B + C");
  default_branched.data.reactants = [];
  expect(ReactionTypes.shortName(default_branched)).toEqual("<none> -> B + C");
  default_branched.data.reactants = [{ name: "A", qty: 2 }];
  expect(ReactionTypes.shortName(default_branched)).toEqual("2A -> B + C");
  default_branched.data.reactants = [
    { name: "A", qty: 2 },
    { name: "D", qty: 1 },
  ];
  expect(ReactionTypes.shortName(default_branched)).toEqual("2A + D -> B + C");

  let default_tunneling = JSON.parse(JSON.stringify(reactionSchema.tunneling));
  expect(ReactionTypes.shortName(default_tunneling)).toEqual(
    "<none> -> <none>",
  );
  default_tunneling.data.reactants = [{ name: "A", qty: 1 }];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("A -> <none>");
  default_tunneling.data.products = [{ name: "B", yield: 1 }];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("A -> B");
  default_tunneling.data.products = [
    { name: "B", yield: 1 },
    { name: "C", yield: 1 },
  ];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("A -> B + C");
  default_tunneling.data.reactants = [];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("<none> -> B + C");
  default_tunneling.data.reactants = [{ name: "A", qty: 2 }];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("2A -> B + C");
  default_tunneling.data.reactants = [
    { name: "A", qty: 2 },
    { name: "D", qty: 1 },
  ];
  expect(ReactionTypes.shortName(default_tunneling)).toEqual("2A + D -> B + C");
});
