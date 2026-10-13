# Music Box Interactive

[![GitHub Releases](https://img.shields.io/github/release/NCAR/music-box-interactive-api.svg)](https://github.com/NCAR/music-box-interactive-api/releases)
[![License](https://img.shields.io/github/license/NCAR/music-box-interactive-api.svg)](https://github.com/NCAR/music-box-interactive-api/blob/master/LICENSE)
[![Tests](https://github.com/NCAR/music-box-interactive-api/actions/workflows/test.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-api/actions/workflows/test.yml)
[![Tests](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pytest.yml/badge.svg)](https://github.com/NCAR/music-box-interactive-api/actions/workflows/pyteset.yml)

**Music Box Interactive** allows for the configuring and running of box models using [Music Box](https://github.com/NCAR/music-box).

## Getting Started

### Environment Setup

```bash
npm install
npm run dev
```

## Running with Docker 

The Docker image builds the app and serves it with nginx on port 80.

1. Make sure Docker is installed and running.
2. From the project root, build the image:

```bash
docker build -t music-box-interactive .
```

3. Run the container:

```bash
docker run --rm -p 8080:80 music-box-interactive
```

4. Open http://localhost:8080 in your browser.

Press CTRL-C to stop the container.

To run the container in a detached state, add the `-d` flag and give the container a name:

```bash
docker run -d --rm -p 8080:80 --name music-box-interactive music-box-interactive
```

To view the logs:

```bash
docker logs -f music-box-interactive
```

To stop the container:

```bash
docker stop music-box-interactive
```

## License
Copyright (C) 2018-2025 University Corporation for Atmospheric Research