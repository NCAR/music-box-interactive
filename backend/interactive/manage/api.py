from django.http import JsonResponse
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import views

import datetime
import manage.response_models as response_models


class HealthView(views.APIView):
    @swagger_auto_schema(
        responses={
            200: openapi.Response(
                description='Success',
                schema=response_models.HealthSerializer
            )
        }
    )
    def get(self, request):
        return JsonResponse({'server_time': datetime.datetime.now()})
