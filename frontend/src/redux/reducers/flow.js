import utils from "../utils";

const initialState = {
  nodes: [],
  links: [],
  selected_species: [],
  ignored_species: [],
  is_log_scale: true,
  max_arrow_width: 3,
  time_range_start_index: 0,
  time_range_end_index: Number.MAX_SAFE_INTEGER,
  local_time_range_start: undefined,
  local_time_range_end: undefined,
  flux_range_start: 0.0,
  flux_range_end: Number.MAX_VALUE,
  local_flux_range_start: undefined,
  local_flux_range_end: undefined,
};

// Redefines the nodes and links that make up the flow diagram based
// on the species selected for inclusion in the flow diagram configuration
const UpdateGraph = (state, dependencies, results) => {
  if (state.time_range_start_index >= results.times.length) {
    state.time_range_start_index = results.times.length - 1;
    state.local_time_range_start = results.times[state.time_range_start_index];
  }
  if (state.time_range_end_index >= results.times.length - 1) {
    state.time_range_end_index = results.times.length - 1;
    state.local_time_range_end = results.times[state.time_range_end_index];
  }
  var rxns = dependencies.filter((reaction) => {
    return (
      [...reaction.reactants, ...reaction.products].filter((species) => {
        return state.selected_species.includes(species.name);
      }).length > 0
    );
  });

  var includedSpecies = {};
  rxns.forEach((reaction) => {
    reaction.reactants
      .filter(
        (species) =>
          !state.ignored_species.find((ignored) => ignored === species.name),
      )
      .forEach((species) => {
        includedSpecies[species.name] = {
          name: species.name,
          className: "species",
        };
      });
    reaction.products
      .filter(
        (species) =>
          !state.ignored_species.find((ignored) => ignored === species.name),
      )
      .forEach((species) => {
        includedSpecies[species.name] = {
          name: species.name,
          className: "species",
        };
      });
  });
  state.nodes = [
    ...rxns.map((reaction, index) => {
      return {
        id: index,
        name: reaction.name,
        className: "reaction",
      };
    }),
    ...Object.values(includedSpecies).map((species, index) => {
      return {
        id: index + rxns.length,
        name: species.name,
        className: species.className,
      };
    }),
  ];
  state.links = rxns.flatMap((reaction, index) => {
    return [
      ...reaction.reactants
        .filter(
          (species) =>
            !state.ignored_species.find((ignored) => ignored === species.name),
        )
        .map((species) => {
          return {
            source: state.nodes.findIndex((node) => node.name === species.name),
            target: index,
            className: "flux",
            reactionId: reaction.id,
            flux: Math.max(
              species.qty *
                results.integrated_reaction_rates[reaction.id]
                  .slice(
                    state.time_range_start_index,
                    state.time_range_end_index + 1,
                  )
                  .reduce((total, elem) => total + elem, 0),
              0,
            ),
          };
        }),
      ...reaction.products
        .filter(
          (species) =>
            !state.ignored_species.find((ignored) => ignored === species.name),
        )
        .map((species) => {
          return {
            source: index,
            target: state.nodes.findIndex((node) => node.name === species.name),
            className: "flux",
            reactionId: reaction.id,
            flux: Math.max(
              species.yield *
                results.integrated_reaction_rates[reaction.id]
                  .slice(
                    state.time_range_start_index,
                    state.time_range_end_index + 1,
                  )
                  .reduce((total, elem) => total + elem, 0),
              0,
            ),
          };
        }),
    ];
  });
  return state;
};

export const flowReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.RESET_ALL: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.RESET_PLOTS: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.SELECT_FLOW_SPECIES: {
      const species = action.payload.content.species;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          selected_species: [
            ...state.selected_species.filter((elem) => elem !== species),
            species,
          ],
          ignored_species: [
            ...state.ignored_species.filter((elem) => elem !== species),
          ],
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.DESELECT_FLOW_SPECIES: {
      const species = action.payload.content.species;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          selected_species: state.selected_species.filter(
            (elem) => elem !== species,
          ),
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.SET_IS_FLOW_PLOT_LOG_SCALE: {
      const isLogScale = action.payload.content.isLogScale;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          is_log_scale: isLogScale,
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.SET_FLOW_MAX_ARROW_WIDTH: {
      const maxArrowWidth = action.payload.content.maxArrowWidth;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          max_arrow_width: maxArrowWidth,
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.SET_FLOW_TIME_RANGE_START_INDEX: {
      const startIndex = action.payload.content.timeIndex;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          time_range_start_index: startIndex,
          local_time_range_start: undefined,
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.SET_FLOW_TIME_RANGE_END_INDEX: {
      const endIndex = action.payload.content.timeIndex;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          time_range_end_index: endIndex,
          local_time_range_end: undefined,
        },
        dependencies,
        results,
      );
    }
    case utils.action_types.SET_FLOW_LOCAL_TIME_RANGE_START: {
      return {
        ...state,
        local_time_range_start: action.payload.content.time,
      };
    }
    case utils.action_types.SET_FLOW_LOCAL_TIME_RANGE_END: {
      return {
        ...state,
        local_time_range_end: action.payload.content.time,
      };
    }
    case utils.action_types.SET_FLOW_FLUX_RANGE_START: {
      return {
        ...state,
        flux_range_start: action.payload.content.flux,
        local_flux_range_start: action.payload.content.flux,
      };
    }
    case utils.action_types.SET_FLOW_FLUX_RANGE_END: {
      return {
        ...state,
        flux_range_end: action.payload.content.flux,
        local_flux_range_end: action.payload.content.flux,
      };
    }
    case utils.action_types.SET_FLOW_LOCAL_FLUX_RANGE_START: {
      return {
        ...state,
        local_flux_range_start: action.payload.content.flux,
      };
    }
    case utils.action_types.SET_FLOW_LOCAL_FLUX_RANGE_END: {
      return {
        ...state,
        local_flux_range_end: action.payload.content.flux,
      };
    }
    case utils.action_types.SET_FLOW_IGNORED_SPECIES: {
      const species = action.payload.content.species;
      const dependencies = action.payload.content.dependencies;
      const results = action.payload.content.results;
      return UpdateGraph(
        {
          ...state,
          ignored_species: [
            ...state.ignored_species.filter((elem) => elem !== species),
            species,
          ],
        },
        dependencies,
        results,
      );
    }
    default:
      return state;
  }
};
