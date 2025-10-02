from shared.unit_dict import unitDict
from shared.converter_class import Unit
from shared.conversion_dict import conversionTree
import pika
import os

import json
base_dir = '/music-box-interactive/interactive'
try:
    from django.conf import settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'manage.settings')
    base_dir = settings.BASE_DIR
except BaseException:
    pass


def beautifyReaction(reaction):
    if '->' in reaction:
        reaction = reaction.replace('->', ' → ')
    if '__' in reaction:
        reaction = reaction.replace('__', ' (')
        reaction = reaction + ")"
    if '_' in reaction:
        reaction = reaction.replace('_', ' + ')
    return reaction

# undo beautifyReaction (usually used when indexing dictionaries)


def unbeautifyReaction(reaction):
    if '→' in reaction:
        reaction = reaction.replace(' → ', '->')
    if '+' in reaction:
        reaction = reaction.replace(' + ', '_')
    return reaction


def direct_open_json(filePath):
    with open(filePath) as f:
        dicti = json.loads(f.read())
    return dicti


def direct_dump_json(filePath, content):
    with open(filePath, 'w') as f:
        json.dump(content, f, indent=4)
        # json.dump(content, f)


# turns 'E a' notation to "10^a" notations
def sci_note(dirty):
    if 'e' in dirty:
        a = dirty.split('e')
        b = a[0].strip('0')
        c = b.strip('.')
        scinote = c + '*10^{' + a[1] + '}'
    else:
        scinote = dirty
    return scinote


# same as sci_note() but with tags for mathjax rendering
def sci_note_jax(dirty):
    if 'e' in dirty:
        a = dirty.split('e')
        b = a[0].strip('0')
        c = b.strip('.')
        scinote = c + '*10^{' + a[1] + '}'
    else:
        scinote = dirty
    jax = "\\" + "begin{equation}" + scinote + "\\" + "end{equation}"
    return jax


# converts parameter labels to mathjax items
def param_jax(dirty):
    if "_" in dirty:
        a = dirty.split('_')
        b = "_{" + a[1] + "}"
        return "\\" + "begin{equation}" + a[0] + b + "=\\" + "end{equation}"
    else:
        return "\\" + "begin{equation}" + dirty + "=\\" + "end{equation}"


def copyAFile(source, destination):
    configFile = open(source, 'rb')
    content = configFile.read()
    g = open(destination, 'wb')
    g.write(content)
    g.close()
    configFile.close()


def create_unit_converter(initial_unit, final_unit):
    convertObject = Unit(conversionTree, unitDict)
    my_converter = convertObject.convert(initial_unit, final_unit)
    return my_converter


def is_density_needed(a, b):
    units = unitDict
    type_a = units[a]['subtype']
    type_b = units[b]['subtype']
    if type_a == type_b:
        return False
    else:
        return True


def getUnitTypes():
    return conversionTree.keys()


def get_required_arguments(initial_unit, final_unit):
    convertObject = Unit(conversionTree, unitDict)
    args = convertObject.get_arguments(initial_unit, final_unit)
    return args

# returns sub prop names


def sub_props_names(subprop):
    namedict = {
        'temperature': "Temperature",
        'pressure': "Pressure",
        'number_density_air': "Density",
    }
    if subprop in namedict:
        return namedict[subprop]
    else:
        return subprop
