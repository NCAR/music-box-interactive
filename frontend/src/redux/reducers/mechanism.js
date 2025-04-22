import utils from "../utils";
import { v4 as uuidv4 } from "uuid";
import { compareName, compareId } from "../../compare";

const initialState = {
  gasSpecies: [{ name: "M", properties: [], static: true }],
  aerosolSpecies: [],
  aerosolPhase: [],
  // This is the representation when chosen from the dropdown menu
  aerosolRepresentationConfig: "Modal",
  // This is the details corresponding to the representation chosen above
  aerosolRepresentation: {
    name: "Modal",
    phase: "",
    "geometric mean diameter": 0,
    "geometric standard deviation": 0,
  },
  reactions: [],
};

export const mechanismReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.RESET_ALL: {
      return {
        ...initialState,
      };
    }
    case utils.action_types.ADD_AEROSOL_SPECIES: {
      const species = action.payload.content;
      const otherSpecies = state.aerosolSpecies.filter((other) => {
        return other.name !== species.name;
      });
      return species.name === ""
        ? state
        : {
            ...state,
            aerosolSpecies: [...otherSpecies, species].sort(compareName),
          };
    }
    case utils.action_types.REMOVE_AEROSOL_SPECIES: {
      const speciesName = action.payload.content;
      const newAerosolSpecies = state.aerosolSpecies.filter((species) => {
        return species.name !== speciesName;
      });
      return {
        ...state,
        aerosolSpecies: [...newAerosolSpecies].sort(compareName),
      };
    }
    case utils.action_types.ADD_AEROSOL_PHASE: {
      const species = action.payload.content;
      const otherSpecies = state.aerosolPhase.filter((other) => {
        return other.name !== species.name;
      });
      return species.name === ""
        ? state
        : {
            ...state,
            aerosolPhase: [...otherSpecies, species].sort(compareName),
          };
    }
    case utils.action_types.REMOVE_AEROSOL_PHASE: {
      const speciesName = action.payload.content;
      const newAerosolSpecies = state.aerosolPhase.filter((species) => {
        return species.name !== speciesName;
      });
      return {
        ...state,
        aerosolPhase: [...newAerosolSpecies].sort(compareName),
      };
    }

    case utils.action_types.SET_AEROSOL_REPRESENTATION: {
      const representationName = action.payload;
      let representationDetailsReset = {};
      switch (representationName) {
        case "Modal":
          representationDetailsReset = {
            name: "Modal",
            phase: "",
            "geometric mean diameter": 0,
            "geometric standard deviation": 0,
          };
          break;
        case "Sectional":
          representationDetailsReset = {
            name: "Sectional",
            phase: "",
            "number of sections": 0,
            "minimum diameter": 0,
            "maximum diameter": 0,
          };
          break;
        case "Single-Particle":
          representationDetailsReset = {
            name: "Single-Particle",
            phase: "",
            "total number of computational particles": 0,
          };
          break;
      }
      return {
        ...state,
        aerosolRepresentationConfig: representationName,
        aerosolRepresentation: representationDetailsReset,
      };
    }

    case utils.action_types.SET_AEROSOL_REPRESENTATION_DETAILS: {
      return {
        ...state,
        aerosolRepresentation: {
          ...state.aerosolRepresentation,
          ...action.payload,
        },
      };
    }

    case utils.action_types.ADD_AEROSOL_REPRESENTATION: {
      const species = action.payload.content;
      const otherSpecies = state.aerosolRepresentation.filter((other) => {
        return other.name !== species.name;
      });
      return species.name === ""
        ? state
        : {
            ...state,
            aerosolRepresentation: [...otherSpecies, species].sort(compareName),
          };
    }
    case utils.action_types.REMOVE_AEROSOL_REPRESENTATION: {
      const speciesName = action.payload.content;
      const newAerosolSpecies = state.aerosolRepresentation.filter(
        (species) => {
          return species.name !== speciesName;
        },
      );
      return {
        ...state,
        aerosolRepresentation: [...newAerosolSpecies].sort(compareName),
      };
    }
    case utils.action_types.ADD_GAS_SPECIES: {
      const species = action.payload.content;
      const otherSpecies = state.gasSpecies.filter((other) => {
        return other.name !== species.name;
      });
      return species.name === ""
        ? state
        : {
            ...state,
            gasSpecies: [...otherSpecies, species].sort(compareName),
          };
    }
    case utils.action_types.ADD_AEROSOL_PROPERTY: {
      const property = action.payload.content.property;
      const speciesName = action.payload.content.speciesName;
      const species = state.aerosolSpecies.filter((species) => {
        return species.name === speciesName;
      });
      const otherSpecies = state.aerosolSpecies.filter((species) => {
        return species.name !== speciesName;
      });
      const otherProperties = species[0].properties.filter((prop) => {
        return prop.name !== property.name;
      });
      return {
        ...state,
        aerosolSpecies: [
          ...otherSpecies,
          {
            ...species[0],
            properties: [...otherProperties, property],
          },
        ].sort(compareName),
      };
    }
    case utils.action_types.REMOVE_GAS_SPECIES: {
      const speciesName = action.payload.content;
      const newGasSpecies = state.gasSpecies.filter((species) => {
        return species.name !== speciesName || species.static;
      });
      return {
        ...state,
        gasSpecies: [...newGasSpecies].sort(compareName),
      };
    }
    case utils.action_types.ADD_PROPERTY: {
      const property = action.payload.content.property;
      const speciesName = action.payload.content.speciesName;
      const species = state.gasSpecies.filter((species) => {
        return species.name === speciesName;
      });
      const otherSpecies = state.gasSpecies.filter((species) => {
        return species.name !== speciesName;
      });
      const otherProperties = species[0].properties.filter((prop) => {
        return prop.name !== property.name;
      });
      return {
        ...state,
        gasSpecies: [
          ...otherSpecies,
          {
            ...species[0],
            properties: [...otherProperties, property],
          },
        ].sort(compareName),
      };
    }
    case utils.action_types.REMOVE_PROPERTY: {
      const removeProperty = action.payload.content;
      const species = state.gasSpecies.filter((species) => {
        return species.name === removeProperty.speciesName;
      });
      const properties = species.properties.filter((property) => {
        return property.name !== removeProperty.name;
      });
      const otherSpecies = state.gasSpecies.filter((species) => {
        return species.name !== removeProperty.speciesName;
      });
      return {
        ...state,
        gasSpecies: [
          ...otherSpecies,
          {
            ...species,
            properties: properties,
          },
        ].sort(compareName),
      };
    }
    case utils.action_types.ADD_REACTION: {
      const reaction = action.payload.content;
      const id = reaction.id || uuidv4();
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== id;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...reaction,
            id: id,
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.UPDATE_REACTION_DATA: {
      const id = action.payload.content.id;
      const data = action.payload.content.data;
      const updatedReaction = state.reactions.filter((reaction) => {
        return reaction.id === id;
      })[0];
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== id;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...updatedReaction,
            data,
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.REMOVE_REACTION: {
      const id = action.payload.content;
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== id;
      });
      return {
        ...state,
        reactions: [...otherReactions].sort(compareId),
      };
    }
    case utils.action_types.ADD_REACTANT: {
      const reactionId = action.payload.content.reactionId;
      const reactant = action.payload.content.reactant;
      const updatedReaction = state.reactions.filter((reaction) => {
        return reaction.id === reactionId;
      })[0];
      const reactantId = reactant.id || uuidv4();
      const otherReactants = updatedReaction.data.reactants.filter((other) => {
        return other.id !== reactantId;
      });
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== reactionId;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...updatedReaction,
            data: {
              ...updatedReaction.data,
              reactants: [
                ...otherReactants,
                {
                  ...reactant,
                  id: reactantId,
                },
              ].sort(compareId),
            },
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.REMOVE_REACTANT: {
      const reactionId = action.payload.content.reactionId;
      const reactantId = action.payload.content.reactantId;
      const updatedReaction = state.reactions.filter((reaction) => {
        return reaction.id === reactionId;
      })[0];
      const otherReactants = updatedReaction.data.reactants.filter((other) => {
        return other.id !== reactantId;
      });
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== reactionId;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...updatedReaction,
            data: {
              ...updatedReaction.data,
              reactants: [...otherReactants].sort(compareId),
            },
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.ADD_PRODUCT: {
      const reactionId = action.payload.content.reactionId;
      const schema = action.payload.content.schema;
      const product = action.payload.content.product;
      const updatedReaction = state.reactions.filter((reaction) => {
        return reaction.id === reactionId;
      })[0];
      const productId = product.id || uuidv4();
      const otherReactants = updatedReaction.data[schema.key].filter(
        (other) => {
          return other.id !== productId;
        },
      );
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== reactionId;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...updatedReaction,
            data: {
              ...updatedReaction.data,
              [schema.key]: [
                ...otherReactants,
                {
                  ...product,
                  id: productId,
                },
              ].sort(compareId),
            },
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.REMOVE_PRODUCT: {
      const reactionId = action.payload.content.reactionId;
      const schema = action.payload.content.schema;
      const productId = action.payload.content.productId;
      const updatedReaction = state.reactions.filter((reaction) => {
        return reaction.id === reactionId;
      })[0];
      const otherReactants = updatedReaction.data[schema.key].filter(
        (other) => {
          return other.id !== productId;
        },
      );
      const otherReactions = state.reactions.filter((reaction) => {
        return reaction.id !== reactionId;
      });
      return {
        ...state,
        reactions: [
          ...otherReactions,
          {
            ...updatedReaction,
            data: {
              ...updatedReaction.data,
              [schema.key]: [...otherReactants].sort(compareId),
            },
          },
        ].sort(compareId),
      };
    }
    case utils.action_types.EXAMPLE_FETCHED: {
      return {
        ...state,
        gasSpecies: action.payload.mechanism.gasSpecies,
        reactions: action.payload.mechanism.reactions,
      };
    }
    default:
      return state;
  }
};
