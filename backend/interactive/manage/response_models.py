from rest_framework import serializers


class HealthSerializer(serializers.Serializer):
    server_time = serializers.DateField()
