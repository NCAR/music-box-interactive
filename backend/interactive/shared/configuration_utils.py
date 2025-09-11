import json
import logging
import numpy as np
import os
import pandas as pd
import shutil
import tempfile
import fjson
from zipfile import ZipFile

logger = logging.getLogger(__name__)


def get_session_path(session_id):
    '''Returns the absolute path to the configuration folder for a given session id'''
    path = os.path.join(
        os.environ['MUSIC_BOX_CONFIG_DIR'],
        session_id)
    os.makedirs(path, exist_ok=True)
    return path


def remove_session_folder(session_id):
    '''Removes the folder containing the configuration for a given session'''
    shutil.rmtree(os.path.join(os.environ['MUSIC_BOX_CONFIG_DIR'], session_id))


def get_config_file_path(session_id):
    '''Returns the absolute path to the MusicBox configuration file'''
    return os.path.join(get_session_path(session_id), "my_config.json")


def get_working_directory(session_id):
    '''Returns the working directory for model runs for a given session id'''
    os.makedirs(os.environ['MUSIC_BOX_BUILD_DIR'], exist_ok=True)
    path = os.path.join(os.environ['MUSIC_BOX_BUILD_DIR'], session_id)
    os.makedirs(path, exist_ok=True)
    return path


def get_zip_folder_path(session_id):
    '''Returns the folder for compressed configurations for a given session'''
    os.makedirs(os.environ['MUSIC_BOX_ZIP_DIR'], exist_ok=True)
    path = os.path.join(os.environ['MUSIC_BOX_ZIP_DIR'], session_id)
    os.makedirs(path, exist_ok=True)
    return path


def get_unzip_folder_path(session_id):
    '''Returns the folder to unzip configurations into'''
    os.makedirs(os.environ['MUSIC_BOX_CONFIG_DIR'], exist_ok=True)
    path = os.path.join(os.environ['MUSIC_BOX_CONFIG_DIR'], session_id)
    os.makedirs(path, exist_ok=True)
    return path


def get_zip_file_path(session_id):
    '''Returns the path for a zip file for a given session id'''
    return os.path.join(get_zip_folder_path(session_id), "config.zip")


def remove_zip_folder(session_id):
    '''Removes the folder holding a compressed configuration for a session'''
    shutil.rmtree(get_zip_folder_path(session_id))


def replace_large_ints(data):
    '''Replaces large ints with floats so they will be output in scientific notation'''
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, int) and float(value) > 1.0e10:
                data[key] = float(value)
            else:
                replace_large_ints(value)
    elif isinstance(data, list):
        for key, value in enumerate(data):
            if isinstance(value, int) and float(value) > 1.0e10:
                data[key] = float(value)
            else:
                replace_large_ints(value)


def save_as_json(data, file, in_scientific_notation=True):
    '''Returns a dictionary as a JSON string optionally with floats in scientific notation'''
    if in_scientific_notation:
        replace_large_ints(data)
        return fjson.dump(
            data,
            file,
            float_format=".12e",
            indent=2,
            separators=(
                ", ",
                ": "))
    else:
        return json.dump(data, file)


def load_configuration(
        session_id,
        config,
        keep_relative_paths=False,
        in_scientific_notation=True):
    '''Loads a JSON configuration from the client and saves it in MusicBox format'''
    session_path = get_session_path(session_id)
    config_file_path = get_config_file_path(session_id)

    camp_config = None
    full_camp_config_path = None
    # for now there's only ever 1 configuration
    # this SHOULD NOT be changed since this is a requirement (that it's an array)
    # which is imposed by music box
    model_config = config["conditions"]["model components"][0]
    if ("type" in model_config) and (model_config["type"] == "CAMP"):
        camp_config = model_config["configuration file"]
        full_camp_config_path = os.path.join(session_path, camp_config)
        # update the camp configuration path to point to the full path on the file system
        # so that the model can find it
        if keep_relative_paths:
            model_config["configuration file"] = camp_config
        else:
            model_config["configuration file"] = full_camp_config_path
    if camp_config is None:
        raise Exception("Could not find camp config")

    camp_dir = os.path.dirname(full_camp_config_path)
    species_config = os.path.join(camp_dir, 'species.json')
    reactions_config = os.path.join(camp_dir, 'reactions.json')
    # make a workding directory in the music box build folder
    # this prevents jobs from differing sessions from overwriting each other
    working_directory = get_working_directory(session_id)

    os.makedirs(camp_dir, exist_ok=True)
    if not os.path.exists(working_directory):
        raise Exception("Did not create working directory")

    if "evolving conditions" in config["conditions"] and isinstance(
            config["conditions"]["evolving conditions"], list):
        evolving = config["conditions"]["evolving conditions"]
        if len(evolving) > 1:
            headers, vals = evolving[0], np.array(evolving[1:])
            data = {}
            for idx, column in enumerate(headers):
                data[column] = vals[:, idx]
            csv_path = os.path.join(session_path, "evolving_conditions.csv")
            pd.DataFrame(data).to_csv(csv_path, index=False)
            if keep_relative_paths:
                config["conditions"]["evolving conditions"] = {
                    "filepaths": ["evolving_conditions.csv"]
                }
            else:
                config["conditions"]["evolving conditions"] = {
                    "filepaths": [csv_path]
                }
        else:
            del config["conditions"]["evolving conditions"]

    if "initial conditions" in config["conditions"] and len(
            config["conditions"]["initial conditions"]) > 0:
        initial = config["conditions"]["initial conditions"]
        df = pd.DataFrame.from_dict(
            initial,
            orient='index',
            columns=['Value']).T.reset_index(
            drop=True)
        csv_path = os.path.join(session_path, "initial_conditions.csv")
        df.to_csv(csv_path, index=False)
        if keep_relative_paths:
            config["conditions"]["initial conditions"] = {
                "filepaths": ["initial_conditions.csv"]
            }
        else:
            config["conditions"]["initial conditions"] = {
                "filepaths": [csv_path]
            }

    # write the box model configuration
    with open(config_file_path, 'w') as f:
        save_as_json(
            config["conditions"],
            f,
            in_scientific_notation=in_scientific_notation)

    # write the mechanism to the camp configuration
    with open(full_camp_config_path, 'w') as f:
        if keep_relative_paths:
            json.dump({"camp-files": ["species.json", "reactions.json"]}, f)
        else:
            json.dump({"camp-files": [species_config, reactions_config]}, f)

    # write the mechanism to the camp configuration
    with open(species_config, 'w') as f:
        save_as_json(config["mechanism"]["species"], f,
                     in_scientific_notation=in_scientific_notation)
    with open(reactions_config, 'w') as f:
        save_as_json(config["mechanism"]["reactions"], f,
                     in_scientific_notation=in_scientific_notation)


def filter_diagnostics(mechanism):
    '''Removes diagnostic species from the mechanism'''
    def species_filter(species):
        if "name" in species and species["name"][0:5] == "irr__":
            return False
        else:
            return True

    mechanism["species"]["camp-data"] = list(
        filter(species_filter, mechanism["species"]["camp-data"]))

    def product_filter(pair):
        key, value = pair
        if key[0:5] == "irr__":
            return False
        else:
            return True

    reactions = mechanism["reactions"]["camp-data"][0]["reactions"]
    for idx, rxn in enumerate(reactions):
        if "products" in rxn:
            reactions[idx]["products"] = dict(
                list(filter(product_filter, rxn["products"].items())))
    mechanism["reactions"]["camp-data"][0]["reactions"] = reactions

    return mechanism


def compress_configuration(session_id):
    '''Creates a compressed file holding the previously loaded configuration for a given session id'''
    config_folder = get_session_path(session_id)
    zip_file_path = get_zip_file_path(session_id)
    logging.info(
        f'Compressing configuration: {config_folder} to: {zip_file_path}')
    make_archive(config_folder, zip_file_path)
    remove_session_folder(session_id)


def make_archive(source, destination):
    '''Creates a compressed version of the source folder. From: http://www.seanbehan.com/how-to-use-python-shutil-make_archive-to-zip-up-a-directory-recursively-including-the-root-folder/'''
    base = os.path.basename(destination)
    name = base.split('.')[0]
    format = base.split('.')[1]

    temp_dir = tempfile.mkdtemp()
    config_path = os.path.join(temp_dir, "config")
    shutil.copytree(source, config_path)

    shutil.make_archive(name, format, temp_dir, "config")
    shutil.move(f"{name}.{format}", destination)
    shutil.rmtree(temp_dir)


def extract_configuration(session_id, zipfile):
    '''Extracts a compressed configuration'''
    content = zipfile.read()
    path = get_zip_file_path(session_id)
    with open(path, 'wb') as f:
        f.write(content)

    extracted_folder = get_unzip_folder_path(session_id)

    with ZipFile(path, 'r') as zip:
        zip.extractall(extracted_folder)

    remove_zip_folder(session_id)
    return True
