FROM fedora:latest AS base

ARG INSTALL_PyPartMC=false

RUN dnf -y update \
    && dnf -y install \
        cmake \
        gcc \
        gcc-c++ \
        gfortran \
        git \
        lapack-devel \
        make \
        m4 \
        netcdf-fortran-devel \
        python3 \
        python3-devel \
        python3-pip \
        sqlite \
        sqlite-devel \
    && dnf clean all

COPY backend/ /music-box-interactive/
WORKDIR /music-box-interactive

# Install dependencies using uv
RUN if [ "$INSTALL_PyPartMC" = "true" ]; then \
        pip install ".[partmc,dev]"; \
    else \
        pip install ".[dev]"; \
    fi

# API Server stage
FROM base AS api-server

# Run Django setup commands
RUN python3 interactive/manage.py makemigrations
RUN python3 interactive/manage.py migrate
RUN python3 interactive/manage.py collectstatic --noinput

# Model Runner stage
FROM base AS model-runner

RUN mkdir -p /partmc/partmc-volume