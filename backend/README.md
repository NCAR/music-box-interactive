# MusicBox Interactive API Server

[![Tests](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pytest.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pyteset.yml)

## User interface for the MusicBox box/column model

**Configure, run, and plot results for the MusicBox model, and edit chemical mechanisms.**

## Build and run

### Local development

Install poetry. It may be preferrable to install into a conda or virtual environment, but poetry installs package dependencies
into its own virutal environment so this isn't necessary.
```
pip install poetry
```

Now install the package dependencies.
```
poetry install
```

If you need to use a specific git branch of a package, open up [`pyrpoject.toml`](/pyproject.toml)
and add a line like this

```
acom_music_box = { git = "https://github.com/NCAR/music-box.git", branch = "my_branch" }
```

If you want to include pypartmc

```
poetry install --extras "pypartmc"
```


To run the api server, you'll need to set environment variables

```
set -a && source .env && set +a  
```

and then you can run the server locally after making and running the migrations


```
poetry run python interactive/manage.py makemigrations
poetry run python interactive/manage.py migrate
poetry run python interactive/manage.py runserver_plus 0.0.0.0:8000
```

#### Model runners

These instructions still need to be written. If you need the model runners, it's best to use the docker option

### Docker

All configuration is handled by docker files and docker compose. First navigate to the project directory.

To build
```
docker compose build
```

To run
```
docker compose up
```

You can press CTRL-C to quite docker compose.

Docker-compose will cache file builds and volumes. If you make a change and you want to see 
it reflected, run the below command and it should rebuild the server code.

```
docker compose down -v \
    && docker compose build \
    && docker compose up --force-recreate
```

If you need to remove absolutely everything

```
docker compose down -v --rmi all \
    && docker system prune \
    && docker compose build --no-cache \
    && docker compose up --force-recreate -d
```

If you would like to run docker in a deteched state, add the `-d` flag like this

```
docker compose up -d
```

If you would like to view the logs after starting docker in a detach state, you can do so like this

```
docker compose logs -f
```

```
docker compose stop model-runner && docker compose build --no-cache model-runner && docker compose up --force-recreate --renew-anon-volumes -d model-runner
```


### One at a time

You can also bring down only one of the docker images and rebuild from scratch if you wish

```
docker compose stop model-runner && docker compose build --no-cache model-runner && docker compose up --force-recreate -d model-runner
```

```
docker compose stop status-listener && docker compose build --no-cache status-listener && docker compose up --force-recreate -d status-listener
```

```
docker compose stop api-server && docker compose build --no-cache api-server && docker compose up --force-recreate -d api-server
```

## Web Files

This repository is only the API server for MusicBox Interactive. If you wish to run the web files, head over to [music-box-interactive-client](https://github.com/NCAR/music-box-interactive-client)

## RabbitMQ Admin

After running `docker compose up -d` you can navigate to the RabbitMQ [http://localhost:15672](http://localhost:15672) admin interface to monitor the queues.
The username is `guest` and the password is `guest`.