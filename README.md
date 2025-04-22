# Music Box Interactive

**Music Box Interactive** is a full-stack application for interactive visualization and execution of chemical model simulations. The project includes a Django backend and a modern React + Vite frontend. It is containerized using Docker and designed for flexibility in both local development and production environments.

---

## Technologies

- **Backend**: Python (Django), Poetry
- **Frontend**: React, Vite, TypeScript
- **Containerization**: Docker, Docker Compose
- **Messaging**: RabbitMQ

---

## Getting Started

### Environment Setup

Create a `.env` file inside the `backend/` folder for development. Example:

```env
# Backend
BASE_API_URL=http://localhost:8000
IsDebug=True
LOG_LEVEL=DEBUG
SECRET_KEY=your-django-secret-key

MUSIC_BOX_BUILD_DIR=/music-box/build
MUSIC_BOX_CONFIG_DIR=/config-files
MUSIC_BOX_ZIP_DIR=/config-archives
PARTMC_ZIP_DIR=/partmc-archives

RABBIT_MQ_HOST=rabbitmq
RABBIT_MQ_USER=guest
RABBIT_MQ_PASSWORD=guest
RABBIT_MQ_PORT=5672

SWAGGER_BASE_PATH=
```

When using Docker Compose, you can also place `.env` in the project root or specify it with:

```bash
docker compose --env-file backend/.env up
```

---

## Running with Docker Compose

1. Make sure Docker is installed and running.
2. From the project root, run:

```bash
docker compose up --build
```

To run in the background:

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

---

## Local Development (Without Docker)

### Backend

```bash
cd backend
poetry install
poetry shell
python interactive/manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: [http://localhost:5173](http://localhost:5173)

---

## Production Deployment

Use the `docker-compose.production.yml` for production builds.

### Required `.env` (/home/shared) directory 

```env
# Backend
BASE_API_URL=https://<domain>.com/api
IsDebug=False
SECRET_KEY=your-prod-secret
LOG_LEVEL=INFO

# RabbitMQ
RABBIT_MQ_HOST=rabbitmq
RABBIT_MQ_USER=guest
RABBIT_MQ_PASSWORD=guest
RABBIT_MQ_PORT=5672
```

### Frontend `.env.production`

```env
VITE_API_URL=https://<domain>.com/api
```

Run production containers:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

---

## License
Copyright (C) 2018-2025 National Center for Atmospheric Research