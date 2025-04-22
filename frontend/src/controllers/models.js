const stringifyReaction = (reactants, products) => {
  const validReactants = reactants.filter(
    (species) => species.name !== undefined,
  );
  const validProducts = products.filter(
    (species) => species.name !== undefined,
  );

  let reactantStr = validReactants
    .map((species) => {
      const qtyStr = species.qty > 1 ? `${species.qty}` : "";
      return `${qtyStr}${species.name}`;
    })
    .join(" + ");

  let productStr = validProducts
    .map((species) => {
      const yieldStr = species.yield !== 1.0 ? `${species.yield}` : "";
      return `${yieldStr}${species.name}`;
    })
    .join(" + ");

  reactantStr = reactantStr.length > 0 ? reactantStr + " ->" : "<none> ->";
  productStr = productStr.length > 0 ? productStr : "<none>";

  const str = `${reactantStr} ${productStr}`;
  return str.length > 40 ? str.slice(0, 37) + "..." : str;
};

const RunStatus = Object.freeze({
  RUNNING: "RUNNING",
  WAITING: "WAITING",
  NOT_FOUND: "NOT_FOUND",
  DONE: "DONE",
  ERROR: "ERROR",
});

const ReactionTypes = Object.freeze({
  ARRHENIUS: "ARRHENIUS",
  PHOTOLYSIS: "PHOTOLYSIS",
  EMISSION: "EMISSION",
  FIRST_ORDER_LOSS: "FIRST_ORDER_LOSS",
  TERNARY_CHEMICAL_ACTIVATION: "TERNARY_CHEMICAL_ACTIVATION",
  TROE: "TROE",
  WENNBERG_NO_RO2: "WENNBERG_NO_RO2",
  WENNBERG_TUNNELING: "WENNBERG_TUNNELING",
  SURFACE_REACTION: "SURFACE",
  shortName(reaction) {
    switch (reaction.data.type) {
      case this.ARRHENIUS:
      case this.TERNARY_CHEMICAL_ACTIVATION:
      case this.TROE:
      case this.WENNBERG_TUNNELING:
        return stringifyReaction(
          reaction.data.reactants,
          reaction.data.products,
        );
      case this.EMISSION:
        return stringifyReaction(
          [],
          reaction.data.species !== undefined
            ? [{ name: reaction.data.species, yield: 1.0 }]
            : [],
        );
      case this.FIRST_ORDER_LOSS:
        return stringifyReaction(
          reaction.data.species !== undefined
            ? [{ name: reaction.data.species }]
            : [],
          [],
        );
      case this.PHOTOLYSIS:
        return stringifyReaction(
          reaction.data.reactant !== undefined
            ? [{ name: reaction.data.reactant }]
            : [],
          reaction.data.products,
        );
      case this.WENNBERG_NO_RO2:
        return stringifyReaction(
          reaction.data.reactants,
          reaction.data.primary_products,
        );
      case this.SURFACE_REACTION:
        return stringifyReaction(
          reaction?.data?.gas_phase_reactant !== null
            ? [{ name: reaction.data.gas_phase_reactant }]
            : [],
          reaction.data.products,
        );
    }
  },
  reactants(reaction) {
    switch (reaction.data.type) {
      case this.ARRHENIUS:
      case this.TERNARY_CHEMICAL_ACTIVATION:
      case this.TROE:
      case this.WENNBERG_TUNNELING:
      case this.WENNBERG_NO_RO2:
        return reaction.data.reactants;
      case this.EMISSION:
        return [];
      case this.FIRST_ORDER_LOSS:
        return reaction.data.species !== undefined
          ? [
              {
                name: reaction.data.species,
                qty: 1.0,
              },
            ]
          : [];
      case this.PHOTOLYSIS:
        return reaction.data.reactant !== undefined
          ? [
              {
                name: reaction.data.reactant,
                qty: 1.0,
              },
            ]
          : [];
      case this.SURFACE_REACTION:
        return reaction?.data?.gas_phase_reactant !== undefined
          ? [
              {
                name: reaction.data.gas_phase_reactant,
                qty: 1.0,
              },
            ]
          : [];
    }
  },
  products(reaction) {
    switch (reaction.data.type) {
      case this.ARRHENIUS:
      case this.TERNARY_CHEMICAL_ACTIVATION:
      case this.TROE:
      case this.WENNBERG_TUNNELING:
      case this.PHOTOLYSIS:
      case this.SURFACE_REACTION:
        return reaction.data.products;
      case this.EMISSION:
        return reaction.data.species !== undefined
          ? [
              {
                name: reaction.data.species,
                yield: 1.0,
              },
            ]
          : [];
      case this.FIRST_ORDER_LOSS:
        return [];
      case this.WENNBERG_NO_RO2:
        return [
          ...reaction.data.primary_products,
          ...reaction.data.secondary_products,
        ];
    }
  },
});

export { ReactionTypes, RunStatus };
