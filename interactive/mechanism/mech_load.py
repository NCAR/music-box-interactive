import json
from django.conf import settings
import logging
import os

def molecule_info():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
            mechanism = json.loads(g.read())['mechanism']

    molecules = mechanism['molecules']
    molec_dict = {}
    for i in molecules:
        molec_dict.update({i['moleculename']: i})
    
    return molec_dict


def molecule_list():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
            mechanism = json.loads(g.read())['mechanism']

    molecules = mechanism['molecules']
    molec_list = []
    for i in molecules:
        molec_list.append(i['moleculename'])
    return molec_list


def henry_equations(value):
    equation1 = "\\" + "begin{equation} H_{e f f}=K_{H}\left(1+" + "\\" + "frac{K_{1}}{K_{2}}[H+]" + "\\" + "right) " + "\\" + "end{equation}"
    equation2 = "\\" + "begin{equation}H_{e f f}=K_{H}" + "\\" + "left(1+" + "\\" + "frac{K_{1}}{[H+]}" + "\\" + "left(1+" + "\\" + "frac{K_{2}}{[H+]}" + "\\" + "right)" + "\\" + "right)" + "\\" + "end{equation}"
    equation3 = "\\" + "begin{equation}K_{H}=\mathrm{kh}_{298} " + "\\" + "exp " + "\\" + "left(" + "\\" + "mathrm{dh}_{r}" + "\\" + "left(" + "\\" + "frac{1}{T}-" + "\\" + "frac{1}{298}" + "\\" + "right)" + "\\" + "right)" + "\\" + "end{equation}"
    equation4 = "\\" + "begin{equation}K_{1}=\mathrm{k} 1_{298} " + "\\" + "exp " + "\\" + "left(" + "\\" + "operatorname{dh} 1_{r}" + "\\" + "left(" + "\\" + "frac{1}{T}-" + "\\" + "frac{1}{298}" + "\\" + "right)" + "\\" + "right)" + "\\" + "end{equation}"
    equation5 = "\\" + "begin{equation}K_{2}=\mathrm{k} 2_{298} " + "\\" + "exp " + "\\" + "left(" + "\\" + "mathrm{dh} 2_{r}" + "\\" + "left(" + "\\" + "frac{1}{T}-" + "\\" + "frac{1}{298}" + "\\" + "right)" + "\\" + "right)" + "\\" + "end{equation}"
    if value == 0:
        return([equation1, equation3, equation4, equation5])
    if value == 1:
        return([equation2, equation3, equation4, equation5])


def stage_form_info(item):
    initial = molecule_info()[item]
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "form_stage.json"), 'w') as f:
        json.dump(initial, f, indent=4)


def initialize_form():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "form_stage.json")) as g:
            info = json.loads(g.read())
    
    return info


def id_molecule():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "form_stage.json")) as g:
            info = json.loads(g.read())
    
    return info['moleculename']


def pretty_names():
    names = {
        "formula": "Formula:",
        'solve': "Solve Type:",
        'hl.henrys_law_type': "Henry's Law Type:",
        'hl.kh_298': "\\" + "begin{equation} \mathrm{kh}_{298}\end{equation}",
        'hl.dh_r': "\\" + "begin{equation}\mathrm{dh}_{r}\end{equation}",
        'hl.k1_298': "\\" + "begin{equation}\mathrm{k1}_{298}\end{equation}",
        'hl.dh1_r': "\\" + "begin{equation}\mathrm{dh1}_{r}\end{equation}",
        'hl.k2_298': "\\" + "begin{equation}\mathrm{k2}_{298}\end{equation}",
        'hl.dh2_r': "\\" + "begin{equation}\mathrm{dh2}_{r}\end{equation}",
        'molecular_weight': "Molecular Weight:",
        'standard_name': "Standard Name:",
        'kh_298': "\\" + "begin{equation} \mathrm{kh}_{298}\end{equation}",
        'dh_r': "\\" + "begin{equation}\mathrm{dh}_{r}\end{equation}",
        'k1_298': "\\" + "begin{equation}\mathrm{k1}_{298}\end{equation}",
        'dh1_r': "\\" + "begin{equation}\mathrm{dh1}_{r}\end{equation}",
        'k2_298': "\\" + "begin{equation}\mathrm{k2}_{298}\end{equation}",
        'dh2_r': "\\" + "begin{equation}\mathrm{dh2}_{r}\end{equation}",
        'henrys_law_type': "Henry's Law Type:",
        'transport': "Transport:",
        'moleculename': "Molecule Name:"
    }
    return names


def save_mol(name, myDict):
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
            datafile = json.loads(g.read())
    mechanism = datafile['mechanism']
    molecules = mechanism['molecules']
    for i in molecules:
        if i['moleculename'] == name:
            n = molecules.index(i)
    old = molecules[n]
    for key in myDict:
        if key.split('.')[0] == 'hl':
            old['henrys_law'].update({key.split('.')[1]: myDict[key]})
        else:
            old.update({key: myDict[key]})
    molecules[n] = old
    mechanism.update({'molecules':molecules})
    datafile.update({'mechanism': mechanism})
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json"), 'w') as f:
        json.dump(datafile, f, indent=4)


def new_m(myDict):
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
            datafile = json.loads(g.read())
    mechanism = datafile['mechanism']
    molecules = mechanism['molecules']
    new = {
                "moleculename": myDict['moleculename'],
                "formula": myDict['formula'],
                "transport": myDict['transport'],
                "solve": myDict['solve'],
                "henrys_law": {
                    "henrys_law_type": myDict['hl.henrys_law_type'],
                    "kh_298": myDict['hl.kh_298'],
                    "dh_r": myDict['hl.dh_r'],
                    "k1_298": myDict['hl.k1_298'],
                    "dh1_r": myDict['hl.dh1_r'],
                    "k2_298": myDict['hl.k2_298'],
                    "dh2_r": myDict['hl.dh2_r']
                },
                "molecular_weight": myDict['molecular_weight'],
                "standard_name": myDict['standard_name']
            }
    
    molecules.append(new)
    mechanism.update({'molecules': molecules})
    datafile.update({'mechanism': mechanism})
    with open(os.path.join(mech_path, "datamolec_info.json"), 'w') as f:
        json.dump(datafile, f, indent=4)
    

def search_list():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
            datafile = json.loads(g.read())
    mechanism = datafile['mechanism']
    molecules = mechanism['molecules']
    name_list = []
    for i in molecules:
        name_list.append(i['moleculename'])
    return name_list


def reaction_name_list():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
        datafile = json.loads(g.read())
    mechanism = datafile['mechanism']
    reactions = mechanism['reactions']
    r_list = []
    for i in reactions:
        reactants = []
        for j in i['reactants']:
            reactants.append(j)
        products = []
        for k in i['products']:
            coef = str(k['coefficient'])
            if coef == '1':
                coef = ''
            prod = k['molecule']
            products.append(coef + prod)
        r_list.append(" + ".join(str(l) for l in reactants) + " -> " + " + ".join(str(x) for x in products))
    
    return r_list


def reaction_dict():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "datamolec_info.json")) as g:
        datafile = json.loads(g.read())
    mechanism = datafile['mechanism']
    reactions = mechanism['reactions']
    r_dict = {}
    for i in reactions:
        reactants = []
        for j in i['reactants']:
            reactants.append(j)
        products = []
        for k in i['products']:
            coef = str(k['coefficient'])
            if coef == '1':
                coef = ''
            prod = k['molecule']
            products.append(coef + prod)
        name = " + ".join(str(l) for l in reactants) + " -> " + " + ".join(str(x) for x in products)
        r_dict.update({name: i})
    
    return r_dict
    

def id_dict(namelist):
    outlist = {}
    i = 0
    for x in namelist:
        first = x.split(' ')[0]
        name = first + str(i)
        i = i+1
        outlist.update({x: name})
    print(outlist)
    return outlist


def stage_reaction_form(name):
    initial = reaction_dict()[name]
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "reaction_stage.json"), 'w') as f:
        json.dump(initial, f, indent=4)
    

def initialize_reactions():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "reaction_stage.json")) as g:
            info = json.loads(g.read())
    
    return info


def pretty_reaction_names():
    names = {
        'rate': 'Rate:',
        'rate_call': 'Rate Call:',
        'rc.reaction_class': 'Reaction Class:',
        'troe': "troe",
        'reactant0': 'Reactant 0',
        'reactant1': 'Reactant 1',
        'reactant2': 'Reactant 2',
        'reactant3': 'Reactant 3',
        'reactant4': 'Reactant 4',
        'rc.A': "A:",
        'rc.B': "B:",
        'rc.C': "C:",
        'rc.D': "D:",
        'rc.E': "E:",
        'rc.A_k0': "A_k0:",
        'rc.B_k0': "B_k0:",
        'rc.C_k0': "C_k0:",
        'p0.coefficient': 'Product 0 Coefficient:',
        'p1.coefficient': 'Product 1 Coefficient:',
        'p2.coefficient': 'Product 2 Coefficient:',
        'p3.coefficient': 'Product 3 Coefficient:',
        'p4.coefficient': 'Product 4 Coefficient:',
        'p5.coefficient': 'Product 5 Coefficient:',
        'p0.molecule': 'Product 0:',
        'p1.molecule': 'Product 1:',
        'p2.molecule': 'Product 2:',
        'p3.molecule': 'Product 3:',
        'p4.molecule': 'Product 4:',
        'p5.molecule': 'Product 5:'
    }
    return names


def id_reaction():
    mech_path = os.path.join(settings.BASE_DIR, "dashboard/static/mechanism")
    with open(os.path.join(mech_path, "reaction_stage.json")) as g:
            info = json.loads(g.read())
    
    r_dict = reaction_dict()

    for key in r_dict:
        if info == r_dict[key]:
            name = key
    
    return name