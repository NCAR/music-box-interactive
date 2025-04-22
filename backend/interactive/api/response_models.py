from rest_framework import serializers
from api.run_status import RunStatus

import base64
import json
import logging

logger = logging.getLogger(__name__)


class RunStatusEncoder(json.JSONEncoder):
    def default(self, obj):
        logger.info(f"object: {obj}")
        if isinstance(obj, RunStatus):
            return obj.name
        return super().default(obj)


class PollingStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[(choice.name, choice.value) for choice in RunStatus])
    error = serializers.CharField(required=False)


class ConfigSerializer(serializers.Serializer):
    mechanism = serializers.JSONField()
    conditions = serializers.JSONField()

    class Meta:
        ref_name = "ConfigResponse"


class FileSerializer(serializers.Serializer):
    filename = serializers.CharField()
    content = serializers.SerializerMethodField()

    def get_content(self, obj):
        with open(obj, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
