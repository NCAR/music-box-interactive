import { ReactionTypes } from "../../controllers/models";

export const getConditions = (store, schema) => {
  if (schema.classKey == "initial_reactions") {
    let conditions = store.conditions[schema.classKey];
    let userDefinedReactions = store.mechanism.reactions
      .filter((reaction) => {
        return reaction.isUserDefined;
      })
      .reduce((acc, reaction) => {
        if (reaction.data.type === "SURFACE") {
          acc.push(
            {
              id: reaction.id,
              type: reaction.tablePrefix,
              name:
                reaction.data.musica_name || ReactionTypes.shortName(reaction),
              suffix: ".number",
              possibleUnits: reaction.possibleUnits,
            },
            {
              id: reaction.id,
              type: reaction.tablePrefix,
              name:
                reaction.data.musica_name || ReactionTypes.shortName(reaction),
              suffix: ".radius",
              possibleUnits: reaction.possibleUnits,
            },
          );
        } else {
          acc.push({
            id: reaction.id,
            type: reaction.tablePrefix,
            name:
              reaction.data.musica_name || ReactionTypes.shortName(reaction),
            suffix: "",
            possibleUnits: reaction.possibleUnits,
          });
        }
        return acc;
      }, []);
    // add the name and type onto the conditions
    return conditions.map((condition) => {
      let found = userDefinedReactions.find(
        (val) =>
          val.id === condition.reactionId && val.suffix === condition.suffix,
      );
      let name = "";
      let type = "";
      let possibleUnits = [];
      if (found) {
        name = `${found.name}${found.suffix}`;
        type = found.type;
        possibleUnits = found.possibleUnits;
      }
      return {
        ...condition,
        name: name,
        type: type,
        possibleUnits: possibleUnits,
      };
    });
  } else {
    return store.conditions[schema.classKey];
  }
};

export const getCondition = (store, schema, conditionId) => {
  return store.conditions[schema.classKey].find(
    (condition) => condition.id === conditionId,
  );
};

export const getEvolvingConditions = (store) => store.conditions.evolving;

export const getPossibleConditions = (store) => {
  return [
    ...store.mechanism.gasSpecies.map((species) => {
      return {
        name: species.name + " [mol m-3]",
        tableName: "CONC." + species.name + ".mol m-3",
      };
    }),
    {
      name: "temperature [K]",
      tableName: "ENV.temperature.K",
    },
    {
      name: "pressure [Pa]",
      tableName: "ENV.pressure.Pa",
    },
    ...store.mechanism.reactions
      .filter((reaction) => {
        return reaction.isUserDefined && reaction.data.musica_name.length > 0;
      })
      .map((reaction) => {
        return {
          name:
            reaction.tablePrefix +
            "." +
            reaction.data.musica_name +
            " [" +
            reaction.possibleUnits[0] +
            "]",
          tableName:
            (reaction.tablePrefix === "PHOT"
              ? "PHOT."
              : `PHOT.${reaction.tablePrefix}_`) +
            reaction.data.musica_name +
            ".s-1",
        };
      }),
  ];
};

export const getEvolvingTable = (store) => {
  return [
    [
      "time.s",
      ...store.conditions.evolving.values.map((value) => value.tableName),
    ],
    ...store.conditions.evolving.times.map((time, timeIndex) => {
      return [
        time,
        ...store.conditions.evolving.values.map(
          (value) => value.values[timeIndex],
        ),
      ];
    }),
  ];
};

export const getAllConditions = (store) => store.conditions;
