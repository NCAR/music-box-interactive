import { ReactionTypes } from "../../controllers/models";

export const getMechanism = (store) => store.mechanism;

export const getMechanismAsObject = (store) => ({ mechanism: store.mechanism });

export const getAerosolSpeciesNames = (store) => {
  return store.mechanism.aerosolSpecies.map((species) => species.name);
};

export const getVariableSpeciesNames = (store) => {
  return store.mechanism.gasSpecies
    .filter((species) => {
      return !species.static;
    })
    .map((species) => species.name);
};

export const getSpeciesNames = (store) => {
  return store.mechanism.gasSpecies.map((species) => species.name);
};

export const getSpeciesTolerance = (store, speciesName) => {
  const species = store.mechanism.gasSpecies.filter(
    (species) => species.name === speciesName,
  )[0];
  const tol = species.properties.filter(
    (prop) => prop.name === "absolute convergence tolerance [mol mol-1]",
  );
  return tol.length > 0 ? tol[0].value : 1.0e-14;
};

export const getAerosolProperty = (store, speciesName) => {
  const species = getMechanism(store).aerosolSpecies.filter((species) => {
    return species.name === speciesName;
  });
  return { properties: species.length > 0 ? species[0].properties : [] };
};

export const getProperty = (store, speciesName) => {
  const species = getMechanism(store).gasSpecies.filter((species) => {
    return species.name === speciesName;
  });
  return { properties: species.length > 0 ? species[0].properties : [] };
};

export const getReactionIds = (store) => {
  return store.mechanism.reactions.map((elem) => elem.id);
};

export const getReactionDependencies = (store) => {
  return store.mechanism.reactions.map((elem) => {
    return {
      id: elem.id,
      name: ReactionTypes.shortName(elem),
      reactants: ReactionTypes.reactants(elem),
      products: ReactionTypes.products(elem),
    };
  });
};

export const getReaction = (store, reactionId) => {
  const reaction = getMechanism(store).reactions.filter((reaction) => {
    return reaction.id === reactionId;
  });
  return reaction[0];
};

export const getReactants = (store, reactionId) => {
  const reaction = getMechanism(store).reactions.filter((reaction) => {
    return reaction.id === reactionId;
  });
  return ReactionTypes.reactants(reaction[0]);
};

export const getProducts = (store, reactionId) => {
  const reaction = getMechanism(store).reactions.filter((reaction) => {
    return reaction.id === reactionId;
  });
  return ReactionTypes.products(reaction[0]);
};

const reactionToLabel = (reaction) => {
  return ReactionTypes.shortName(reaction);
};

export const getUserDefinedRatesIds = (store) => {
  return store.mechanism.reactions
    .filter((reaction) => {
      return reaction.isUserDefined;
    })
    .reduce((acc, reaction) => {
      if (reaction.data.type === "SURFACE") {
        acc.push(
          {
            id: reaction.id,
            type: reaction.data.type,
            name: reaction.data.musica_name || reactionToLabel(reaction),
            suffix: ".number",
            possibleUnits: reaction.possibleUnits,
          },
          {
            id: reaction.id,
            type: reaction.data.type,
            name: reaction.data.musica_name || reactionToLabel(reaction),
            suffix: ".radius",
            possibleUnits: reaction.possibleUnits,
          },
        );
      } else {
        acc.push({
          id: reaction.id,
          type: reaction.data.type,
          name: reaction.data.musica_name || reactionToLabel(reaction),
          suffix: "",
          possibleUnits: reaction.possibleUnits,
        });
      }
      return acc;
    }, []);
};

export const getPossibleUnits = (store, reactionId) => {
  return getMechanism(store)
    .reactions.filter((reaction) => {
      return reaction.id === reactionId;
    })
    .map((reaction) => {
      return reaction.possibleUnits;
    })[0];
};
