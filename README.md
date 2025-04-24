# Music Box Interactive

[![GitHub Releases](https://img.shields.io/github/release/NCAR/music-box-interactive-api.svg)](https://github.com/NCAR/music-box-interactive-api/releases)
[![License](https://img.shields.io/github/license/NCAR/music-box-interactive-api.svg)](https://github.com/NCAR/music-box-interactive-api/blob/master/LICENSE)
[![Tests](https://github.com/NCAR/music-box-interactive-api/actions/workflows/test.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-api/actions/workflows/test.yml)
[![Tests](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pytest.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pyteset.yml)

**Music Box Interactive** is a full-stack application for interactive visualization and execution of chemical mechanisms. The project includes a Django backend and a modern React + Vite frontend. It is containerized using Docker and designed for flexibility in both local development and production environments.

## Getting Started

### Environment Setup

Create a `.env` file inside the `backend/` folder for development,if it doesn't exist. Example:

```env
BASE_API_URL="http://localhost:8000"
IsDebug=True
LOG_LEVEL=DEBUG
MUSIC_BOX_BUILD_DIR=/music-box/build
MUSIC_BOX_CONFIG_DIR=/config-files
MUSIC_BOX_ZIP_DIR=/config-archives
PARTMC_ZIP_DIR=/partmc-archives
RABBIT_MQ_HOST=rabbitmq
RABBIT_MQ_PASSWORD=guest
RABBIT_MQ_PORT=5672
RABBIT_MQ_USER=guest
SWAGGER_BASE_PATH=''
SECRET_KEY=
```

## Running with Docker 

1. Make sure Docker is installed and running.
2. From the project root, run:

```bash
docker compose up --build
```
You can press CTRL-C to quite docker compose.

To run docker in a deteched state, add the -d flag like this:

```bash
docker compose up -d
```

To stop and remove containers:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

## Production Deployment

Use the `docker-compose.prod.yml` for production builds.

## License
Copyright (C) 2018-2025 National Center for Atmospheric Research