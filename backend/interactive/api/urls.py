from django.urls import path

import api.api as api

app_name = 'api'

urlpatterns = [
    path(
        'api/load-example',
        api.LoadExample.as_view(),
        name='set-example'),
    path(
        'api/run',
        api.RunView.as_view(),
        name='run'),
    path(
        'api/run-status',
        api.RunStatusView.as_view(),
        name='run_status'),
    path(
        'api/load-results',
        api.LoadResultsView.as_view(),
        name='run_status'),
    path(
        'api/compress-config',
        api.CompressConfigurationView.as_view(),
        name='compress-config'),
    path(
        'api/extract-config',
        api.ExtractConfigurationView.as_view(),
        name='extract-config'),
    path(
        'api/download-results',
        api.DownloadResultsView.as_view(),
        name='download-results')]
