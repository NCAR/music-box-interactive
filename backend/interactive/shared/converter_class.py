# convert units of the same type and different scales
def scaleUnits(initial_unit, final_unit, unit_dict):
    initial_factor = unit_dict[initial_unit]['factor']
    final_factor = unit_dict[final_unit]['factor']
    return lambda x: (x / initial_factor) * final_factor


# convert unit to standard unit for unit type
def scaleToBase(initial_unit, unit_dict):
    initial_factor = unit_dict[initial_unit]['factor']
    return lambda x: x / initial_factor


# convert unit from standard unit to final unit
def scaleFromBase(final_unit, unit_dict):
    final_factor = unit_dict[final_unit]['factor']
    return lambda x: x * final_factor


class Unit:
    def __init__(self, conversionTree, unitDict):
        self.tree = conversionTree
        self.unitDict = unitDict

    def convert(self, initial_unit, final_unit):
        if 'subtype' in self.unitDict[initial_unit]:
            if self.unitDict[initial_unit]['subtype'] == self.unitDict[final_unit]['subtype']:
                # if conversion does not change unit subtype:
                unitScaler = scaleUnits(
                    initial_unit, final_unit, self.unitDict)
                return unitScaler
            else:
                # if subtype changes
                def unitChange(value, kwargs={}):
                    initial_subtype = self.unitDict[initial_unit]['subtype']
                    initial_type = self.unitDict[initial_unit]['type']
                    final_subtype = self.unitDict[final_unit]['subtype']
                    # intermediate type in conversion
                    base_subtype = self.tree[initial_type]['base unit type']

                    scale_to_base_unit = scaleToBase(
                        initial_unit, self.unitDict)

                    convert_to_base_type = self.tree[initial_type][base_subtype][initial_subtype]['function']
                    convert_to_base_type_args = self.tree[initial_type][base_subtype][initial_subtype]['arguments']
                    convert_to_base_type_args = [
                        x for x in convert_to_base_type_args if 'units' not in x]
                    convert_to_final_type = self.tree[initial_type][final_subtype][base_subtype]['function']
                    convert_to_final_type_args = self.tree[initial_type][final_subtype][base_subtype]['arguments']
                    convert_to_final_type_args = [
                        i for i in convert_to_final_type_args if 'units' not in i]

                    scale_to_final_unit = scaleFromBase(
                        final_unit, self.unitDict)

                    # convert kwargs to base units if a unit is provided
                    converted_kwargs = {}
                    for key in kwargs:
                        if 'units' not in key:
                            kwValue = kwargs[key]
                            unitName = key + "_units"
                            if unitName in kwargs:
                                inputUnit = kwargs[unitName]
                                scaler_to_base = scaleToBase(
                                    inputUnit, self.unitDict)
                                kwValue = scaler_to_base(kwValue)
                            converted_kwargs.update(
                                {key.replace("_", ' '): kwValue})

                    value = scale_to_base_unit(value)
                    value = convert_to_base_type(
                        value, {j: converted_kwargs[j] for j in convert_to_base_type_args})
                    value = convert_to_final_type(
                        value, {k: converted_kwargs[k] for k in convert_to_final_type_args})
                    value = scale_to_final_unit(value)
                    return value
            return unitChange
        else:
            # if unit does not have unit subtype:
            unitScaler = scaleUnits(initial_unit, final_unit, self.unitDict)
            return unitScaler

    def get_arguments(self, initial_unit, final_unit):
        initial_subtype = self.unitDict[initial_unit]['subtype']
        initial_type = self.unitDict[initial_unit]['type']
        final_subtype = self.unitDict[final_unit]['subtype']
        # intermediate type in conversion
        if initial_subtype == final_subtype:
            return []
        else:
            base_subtype = self.tree[initial_type]['base unit type']
            convert_to_base_type_args = self.tree[initial_type][base_subtype][initial_subtype]['arguments']
            convert_to_base_type_args = [
                x for x in convert_to_base_type_args if 'units' not in x]
            convert_to_final_type_args = self.tree[initial_type][final_subtype][base_subtype]['arguments']
            convert_to_final_type_args = [
                i for i in convert_to_final_type_args if 'units' not in i]
            arguments = []
            for i in convert_to_base_type_args:
                arguments.append(i)
            for j in convert_to_final_type_args:
                arguments.append(j)

            return arguments
