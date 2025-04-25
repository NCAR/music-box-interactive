from django.urls import path, include
from drf_yasg import openapi
from drf_yasg.generators import OpenAPISchemaGenerator
from drf_yasg.views import get_schema_view
from rest_framework import permissions

import os

import manage.api as api

app_name = 'manage'


class SchemaGenerator(OpenAPISchemaGenerator):
    def get_schema(self, request=None, public=False):
        basepath = os.environ.get('SWAGGER_BASE_PATH', 'musicbox/')
        schema = super(SchemaGenerator, self).get_schema(request, public)
        schema.basePath = os.path.join(schema.basePath, basepath)
        return schema


schema_view = get_schema_view(
    openapi.Info(
        title="MusicBox Interactive API",
        default_version='v1',
        description="MusicBox interactive API",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="contact@snippets.local"),
        license=openapi.License(name="Apache 2.0"),
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
    generator_class=SchemaGenerator,
)

urlpatterns = [
    path('', include('api.urls')),
    path('', include('django_prometheus.urls')),
    path('manage/health', api.HealthView.as_view(), name='health'),
    path('manage/swagger', schema_view.with_ui('swagger',
         cache_timeout=0), name='schema-swagger-ui'),
]
