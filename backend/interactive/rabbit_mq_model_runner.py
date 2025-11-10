# these imports must come first # noqa: E402
import os  # noqa: E402
import django  # noqa: E402
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'manage.settings')  # noqa: E402
django.setup()  # noqa: E402

import sys
import shutil
import logging
import json
import functools
import traceback
import os
import time
from api.controller import get_model_run, safely_save_data
from shared.rabbit_mq import consume, rabbit_is_available, acknowledge_and_pause_consumer, ConsumerConfig
from shared.configuration_utils import load_configuration, \
    get_working_directory, \
    get_session_path
from api.run_status import RunStatus
import pandas as pd

from acom_music_box import MusicBox

# disable propagation
logging.getLogger("pika").propagate = False


def set_model_run_status(session_id, status, error=None, output=None, partmc_output_path=None):
    """
    Sets the status of the model run in the database
    """
    model_run = get_model_run(session_id)
    model_run.status = status
    model_run.results['error'] = error
    model_run.results['/output.csv'] = output
    if partmc_output_path:
        model_run.results['partmc_output_path'] = partmc_output_path
    safely_save_data(model_run)
    logging.info(f"Model run saved to database for session {session_id}")


def music_box_exited_handler(session_id, output_directory):
    """
    Handles MusicBox model run completion
    """
    exception_message = None
    status = RunStatus.DONE.value
    output = None
    error = None

    # check number of output files in /build
    output_files = getListOfFiles(output_directory)
    if len(output_files) == 0:
        logging.info(f"[{session_id}] No output files found")
        exception_message = "No output files found"
        status = RunStatus.ERROR.value

    csv_path = os.path.join(output_directory, 'output.csv')
    output = pd.read_csv(csv_path).to_csv(index=False)

    # remove all files to save space
    shutil.rmtree(output_directory)

    if exception_message is not None:
        error = json.dumps({'message': exception_message})

    set_model_run_status(session_id, status, error=error, output=output)


def partmc_exited_callback(session_id, future):
    """
    Callback for handling PartMC model run completion
    """
    exception_message = None
    status = RunStatus.DONE.value
    error = None
    partmc_output_path = None

    status = RunStatus.DONE.value
    if future.exception() is not None:
        exception_message = ''.join(
            traceback.format_exception(
                None,
                future.exception(),
                future.exception().__traceback__))
        logging.error(f"[{session_id}] MusicBox finished with exception: {exception_message}")
        status = RunStatus.ERROR.value
    else:
        logging.info(f"[{session_id}] PartMC Model finished.")

        output_directory = f"/partmc/partmc-volume/{session_id}"
        partmc_output_path = f"/music-box-interactive/interactive/partmc-volume/{session_id}"

        # check number of output files in output directory
        output_files = getListOfFiles(output_directory)
        if len(output_files) == 0:
            logging.info(f"[{session_id}] No output files found")
            shutil.rmtree(output_directory)
            status = RunStatus.ERROR.value
            exception_message = "No output files found"

    if exception_message is not None:
        error = json.dumps({'message': exception_message})

    set_model_run_status(session_id, status, error=error, partmc_output_path=partmc_output_path)


def run_request_callback(ch, method, properties, body):
    """
    Callback for handling run requests
    """
    data = json.loads(body)
    session_id = data["session_id"]
    logging.debug(f"Received run request for session {session_id}; Pausing consumer")
    acknowledge_and_pause_consumer(ch, method)
    try:
        config = data["config"]
        logging.info(f"configuration: {config}")
        load_configuration(session_id, config, keep_relative_paths=True)
        logging.info(f"Adding runner for session {session_id} to pool")

        # Searching through the payload json to see if aerosol is present. If it is, run musicbox
        # and PartMC. If it isn't, run musicbox only.
        aerosols_payload = config.get('aerosols', {})
        contains_aerosol = len(
            aerosols_payload.get(
                'aerosolSpecies',
                [])) != 0 or len(
            aerosols_payload.get(
                'aerosolPhase',
                [])) != 0

        if contains_aerosol:
            run_partmc(session_id)
        else:
            run_music_box(session_id)

    except Exception as e:
        set_model_run_status(session_id, RunStatus.ERROR.value, error=str(e))
        logging.exception('Setting up run failed')

    logging.debug(f"Resuming consumer for session {session_id} and acknowledging message")
    start_consumer()


def run_music_box(session_id):
    """
    Runs the music box model
    """
    set_model_run_status(session_id, RunStatus.RUNNING.value)
    path = get_session_path(session_id)
    config_file_path = os.path.join(path, 'my_config.json')
    working_directory = get_working_directory(session_id)
    output_file = os.path.join(working_directory, "output.csv")

    set_model_run_status(session_id, RunStatus.RUNNING.value)

    music_box = MusicBox()
    music_box.loadJson(config_file_path)
    df = music_box.solve()
    df.to_csv(output_file, index=False)

    music_box_exited_handler(session_id, working_directory)


def run_partmc(session_id):
    """
    Runs the PartMC model
    """
    from partmc_model.default_partmc import run_pypartmc_model
    os.makedirs(f"/partmc/partmc-volume/{session_id}", exist_ok=True)
    future = pool.submit(
        run_pypartmc_model,
        session_id
    )
    future.add_done_callback(
        functools.partial(
            partmc_exited_callback,
            session_id,
        ))
    set_model_run_status(session_id, RunStatus.RUNNING.value)


def start_consumer():
    """
    Starts the RabbitMQ consumer
    """
    consume(consumer_configs=[
        ConsumerConfig(
            route_keys=['run_request'], callback=run_request_callback
        )
    ])
    logging.info("RabbitMQ consumer started")


def getListOfFiles(dirName):
    """
    Get list of all files in a directory
    """
    return [os.path.join(root, file) for root, _, files in os.walk(dirName) for file in files]


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.DEBUG,
        format=("%(relativeCreated)04d %(process)05d %(threadName)-10s "
                "%(levelname)-5s %(msg)s"))

    def connect_to_rabbit():
        retries = 0
        while True:
            if rabbit_is_available():
                start_consumer()
                return
            else:
                logging.warning('[WARN] RabbitMQ server is not running. Retrying in 5 seconds...')
                time.sleep(5)
                retries += 1

    try:
        connect_to_rabbit()
    except KeyboardInterrupt:
        logging.debug('Interrupted')
        try:
            sys.exit(0)
        except SystemExit:
            os.exit(0)
