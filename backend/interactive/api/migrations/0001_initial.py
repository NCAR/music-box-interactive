from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='ModelRun',
            fields=[
                ('uid', models.CharField(max_length=50, primary_key=True, serialize=False)),
                ('config_checksum', models.CharField(max_length=50)),
                ('status', models.CharField(choices=[('RUNNING', 'RUNNING'), ('WAITING', 'WAITING'),
                 ('NOT_FOUND', 'NOT_FOUND'), ('DONE', 'DONE'), ('ERROR', 'ERROR')], max_length=50)),
                ('results', models.JSONField(default=dict)),
                ('should_cache', models.BooleanField(default=True)),
            ],
        ),
    ]
