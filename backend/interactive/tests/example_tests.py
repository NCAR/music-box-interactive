import pytest
from django.urls import reverse
from rest_framework.test import APIClient
import json
import api.controller as controller


@pytest.fixture
def api_client():
    return APIClient()

# The results from client testing and the controller function are
# different, so rounding is needed


def round_floats(obj, precision=2):
    if isinstance(obj, dict):
        return {k: round_floats(v, precision) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [round_floats(elem, precision) for elem in obj]
    elif isinstance(obj, float):
        return round(obj, precision)
    else:
        return obj

# The result from client testing somehow turns some of the keys into integers and others into string.
# This function is to turn all the keys into strings for the sake of simplicity


def convert_keys_to_strings(obj):
    if isinstance(obj, dict):
        return {str(k): convert_keys_to_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_keys_to_strings(elem) for elem in obj]
    else:
        return obj


@pytest.mark.django_db
def test_chapman_example_api(api_client):
    url = reverse('api:set-example')
    params = {'example': "CHAPMAN"}

    response = api_client.get(url, params)
    json_data = response.json()
    conditions, mechanism = controller.load_example("CHAPMAN")
    expected_data = {'conditions': conditions, 'mechanism': mechanism}

    rounded_json_data = round_floats(
        convert_keys_to_strings(json_data), precision=5)
    rounded_expected_data = round_floats(
        convert_keys_to_strings(expected_data), precision=5)
    assert response.status_code == 200
    assert rounded_json_data == rounded_expected_data


@pytest.mark.django_db
def test_flow_tube_example_api(api_client):
    url = reverse('api:set-example')
    params = {'example': "FLOW_TUBE"}

    response = api_client.get(url, params)
    json_data = response.json()
    conditions, mechanism = controller.load_example("FLOW_TUBE")
    expected_data = {'conditions': conditions, 'mechanism': mechanism}

    rounded_json_data = round_floats(
        convert_keys_to_strings(json_data), precision=5)
    rounded_expected_data = round_floats(
        convert_keys_to_strings(expected_data), precision=5)
    assert response.status_code == 200
    assert rounded_json_data == rounded_expected_data


@pytest.mark.django_db
def test_full_gas_phase_example_api(api_client):
    url = reverse('api:set-example')
    params = {'example': "FULL_GAS_PHASE"}

    response = api_client.get(url, params)
    json_data = response.json()
    conditions, mechanism = controller.load_example("FULL_GAS_PHASE")
    expected_data = {'conditions': conditions, 'mechanism': mechanism}

    rounded_json_data = round_floats(
        convert_keys_to_strings(json_data), precision=5)
    rounded_expected_data = round_floats(
        convert_keys_to_strings(expected_data), precision=5)
    assert response.status_code == 200
    assert rounded_json_data == rounded_expected_data
