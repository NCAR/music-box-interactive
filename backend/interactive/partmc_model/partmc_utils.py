from api import models
import logging
from shared.configuration_utils import make_archive
import os
import shutil


def compress_partmc(session_id):
    '''Creates a compressed file holding the partmc output from a given session id'''
    model = models.ModelRun.objects.get(uid=session_id)
    partmc_folder = model.results['partmc_output_path']
    partmc_zip_file_path = get_partmc_zip_file_path(session_id)
    logging.info(
        f'Compressing configuration: {partmc_folder} to: {partmc_zip_file_path}')
    make_archive(partmc_folder, partmc_zip_file_path)


def get_partmc_zip_file_path(session_id):
    '''Returns the path for a zip file for a given session id'''
    return os.path.join(get_partmc_zip_folder_path(session_id), "config.zip")


def get_partmc_zip_folder_path(session_id):
    '''Returns the folder for zipped partmc for a given session'''
    os.makedirs(os.environ['PARTMC_ZIP_DIR'], exist_ok=True)
    path = os.path.join(os.environ['PARTMC_ZIP_DIR'], session_id)
    os.makedirs(path, exist_ok=True)
    return path


def remove_zip_folder_partmc(session_id):
    '''Removes the folder holding a compressed partmc for a session'''
    shutil.rmtree(get_partmc_zip_folder_path(session_id))
