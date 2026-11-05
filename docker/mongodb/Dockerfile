FROM golang:1.26.10-alpine AS gosu-builder
RUN apk add --no-cache git
RUN git clone --depth 1 --branch 1.20 https://github.com/tianon/gosu.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gosu .

FROM mongo:7.0
COPY --from=gosu-builder /gosu /usr/local/bin/gosu

RUN npm install --prefix /opt/js-yaml --no-save --omit=dev js-yaml@3.15.2 \
    && apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY *.js /docker-entrypoint-initdb.d/
