from django.http import HttpResponse
from shared.unit_dict import unitDict


def make_unit_convert_form(unit_type):
    response = HttpResponse()
    units = unitDict

    unit_options = [key for key in units if units[key]['type'] == unit_type]
    response.write('<form id="conversionCalculatorForm" method="get"><div class="input-group mb-3"><select class="btn btn-primary dropdown-toggle unit-select" id="initialValueUnit">')
    for unit in unit_options:
        response.write('<option value="')
        response.write(unit)
        response.write('">')
        response.write(unit)
        response.write('</option>')
    response.write(
        '<input type="text" id="initialValue" class="form-control" placeholder="Enter value"></div>')
    response.write('<div id="additionalArgumentsHolder"></div>')
    response.write('<div class="input-group mb-3"><span class="input-group-text">Convert to:</span><select class="btn btn-primary dropdown-toggle unit-select" id="finalValueUnit">')
    for unit in unit_options:
        response.write('<option value="')
        response.write(unit)
        response.write('">')
        response.write(unit)
        response.write('</option>')
    response.write('</select></div></form>')
    response.write(
        '<button id="convertSubmit" class="btn btn-primary">Convert</button>')
    return response


def make_additional_argument_form(arguments):
    response = HttpResponse()
    for arg in arguments:
        arg_unit_options = [
            key for key in unitDict if unitDict[key]['type'] == arg]
        response.write(
            '<div class="input-group mb-3"><span class="input-group-text">')
        response.write(arg)
        response.write(
            '</span><select class="btn btn-primary dropdown-toggle" id="arg_')
        response.write(arg)
        response.write('">')
        for unit in arg_unit_options:
            response.write('<option value="')
            response.write(unit)
            response.write('">')
            response.write(unit)
            response.write('</option>')
        response.write('</select>')
        response.write(
            '<input type="text" id="initialValue" class="form-control" placeholder="Enter value"></div>')

    return response
