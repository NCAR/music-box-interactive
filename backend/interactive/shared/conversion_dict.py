# dictionary with lambda functions for all conversions between unit types
# (ex. number density -> mixing ratio)

# format:
# function = conversionTree[unit type][final unit subtype][initial unit
# subtype]

conversionTree = {
    "concentration": {
        "base unit type": "number density",
        "number density": {
            'area mass density': {
                'arguments': ['molar mass', 'height', 'molar mass units', 'height units'],
                'function': (lambda concentration, args: concentration / args['molar mass'] / args['height'])
            },
            'mixing ratio': {
                'arguments': ['density', 'density units'],
                'function': (lambda concentration, args: concentration * args['density'])
            },
            'number density': {
                'arguments': [],
                'function': (lambda concentration, args: concentration)
            }
        },
        'area mass density': {
            'number density': {
                'arguments': ['molar mass', 'height', 'molar mass units', 'height units'],
                'function': (lambda concentration, args: concentration * args['molar mass'] * args['height'])
            }
        },
        'mixing ratio': {
            'number density': {
                'arguments': ['density', 'density units'],
                'function': (lambda concentration, args: concentration / args['density'])
            }
        }
    },
    'temperature': {
        'base unit type': 'celsius',
        'celsius': {
            'base unit': 'C',
            'fahrenheit': {
                'arguments': [],
                'function': (lambda temperature, args: (temperature - 32) / 1.8)
            },
            'kelvin': {
                'arguments': [],
                'function': (lambda temperature, args: (temperature - 273.15))
            },
            'celsius': {
                'arguments': [],
                'function': (lambda temperature, args: temperature)
            }

        },
        'kelvin': {
            'base unit': 'K',
            'celsius': {
                'arguments': [],
                'function': (lambda temperature, args: (temperature + 273.15))
            }
        },
        'fahrenheit': {
            'base unit': 'F',
            'celsius': {
                'arguments': [],
                'function': (lambda temperature, args: (temperature * 1.8) + 32)
            }
        }
    },
    'pressure': {

    },
    'height': {},
    'molar mass': {},
    'density': {
        'base unit type': "standard density"
    }
}
