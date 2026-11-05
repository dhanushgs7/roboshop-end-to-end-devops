FROM mongo:7.0

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY *.js /docker-entrypoint-initdb.d/
