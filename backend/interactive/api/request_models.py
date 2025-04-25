from rest_framework import serializers
from enum import Enum


class Example(Enum):
    CHAPMAN = 'CHAPMAN'
    FLOW_TUBE = 'FLOW_TUBE'
    FULL_GAS_PHASE = 'FULL_GAS_PHASE'
    TS1 = 'TS1'


class LoadExampleSerializer(serializers.Serializer):
    example = serializers.ChoiceField(
        choices=[e.value for e in Example], required=True)


class ConfigSerializer(serializers.Serializer):
    mechanism = serializers.JSONField()
    conditions = serializers.JSONField()

    class Meta:
        ref_name = "ConfigRequeset"
