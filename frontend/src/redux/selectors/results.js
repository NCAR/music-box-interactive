import { convert } from "../../controllers/unit_conversion";

export const getRunStatus = (store) => store.results.runStatus;

export const getLastError = (store) => store.results.error;

export const getPlotDataByType = (store, plot) => {
  if (plot.id.startsWith("CONC.")) {
    if (plot.id.includes("irr__")) {
      let which = plot.id.substring(10);
      let data = convert(
        "mol m-3",
        plot.units,
        getResultIntegratedReactionRate(store, which),
        store.results.data.air_density,
      );
      return {
        data: store.results.data.times.map((elem, idx) => {
          return { time: elem, value: data[idx] };
        }),
        label: plot.label,
        units: plot.units,
      };
    } else {
      let which = plot.id.substring(5);
      let conc = getResultSpeciesConcentration(store, which);
      let data = convert(
        "mol m-3",
        plot.units,
        conc,
        store.results.data.air_density,
      );
      return {
        data: store.results.data.times.map((elem, idx) => {
          return { time: elem, value: data[idx] };
        }),
        label: plot.label,
        units: plot.units,
      };
    }
  } else if (plot.id.startsWith("ENV.")) {
    let which = plot.id.substring(4);
    switch (which) {
      case "temperature":
        return {
          data: store.results.data.times.map((elem, idx) => {
            return { time: elem, value: store.results.data.temperature[idx] };
          }),
          label: "Temperature",
          units: "K",
        };
      case "pressure":
        return {
          data: store.results.data.times.map((elem, idx) => {
            return { time: elem, value: store.results.data.pressure[idx] };
          }),
          label: "Pressure",
          units: "Pa",
        };
    }
  } else if (plot.id.startsWith("PARTMC.")) {
    let which = plot.id.substring(7);
    switch (which) {
      case "mass_conc":
        return {
          data: store.results.data.partMCTimes.map((elem, idx) => {
            return {
              time: elem,
              value: store.results.data.mass_concentration[idx],
            };
          }),
          label: plot.label,
          units: "K",
        };
      case "number_conc":
        return {
          data: store.results.data.partMCTimes.map((elem, idx) => {
            return {
              time: elem,
              value: store.results.data.number_concentration[idx],
            };
          }),
          label: plot.label,
          units: "Pa",
        };
    }
  }
};

export const getResultTimes = (store) => store.results.data.times;

export const getResultTemperatures = (store) => store.results.data.temperatures;

export const getResultPressures = (store) => store.results.data.pressures;

export const getResultSpeciesConcentration = (store, speciesName) =>
  store.results.data.species.filter((species) => {
    return species.name === speciesName;
  })[0]?.concentration;

export const getResultIntegratedReactionRate = (store, reactionIndex) =>
  store.results.data.integrated_rates[reactionIndex];

export const getResults = (store) => {
  return {
    times: store.results.data.times,
    species_concentrations: store.results.data.species,
    integrated_reaction_rates: store.results.data.integrated_rates,
  };
};
