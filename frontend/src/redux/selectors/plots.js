import { getMechanism, getSpeciesNames } from "./mechanism";
import { ReactionTypes } from "../../controllers/models";

export const getPlotsByType = (store, plotType) => {
  return store.plots[plotType].plots;
};

export const getSpeciesPlots = (store) => {
  const speciesNames = getSpeciesNames(store);
  const filteredSpecies = speciesNames.filter((name) => name !== "M");

  return filteredSpecies.map((name) => ({
    label: name,
    id: `CONC.${name}`,
  }));
};

export const getReactionPlots = (store) => {
  return getMechanism(store).reactions.reduce((list, reaction, index) => {
    const strLabel =
      ReactionTypes.shortName(reaction) + " (" + reaction.typeLabel + ")";
    if (reaction.data.type === ReactionTypes.WENNBERG_NO_RO2) {
      list.push({
        label: strLabel + " primary",
        id: `CONC.irr__${reaction.id}a`,
        index: index,
      });
      list.push({
        label: strLabel + " secondary",
        id: `CONC.irr__${reaction.id}b`,
        index: index,
      });
    } else {
      list.push({
        label: strLabel,
        id: `CONC.irr__${reaction.id}`,
        index: index,
      });
    }
    return list;
  }, []);
};

export const getEnvironmentPlots = (store) => {
  return [
    { label: "temperature", id: "ENV.temperature" },
    { label: "pressure", id: "ENV.pressure" },
  ];
};

export const getAerosolPlots = (store) => {
  return [
    { label: "mass_concentration", id: "PARTMC.mass_conc" },
    { label: "number_concentration", id: "PARTMC.number_conc" },
  ];
};
