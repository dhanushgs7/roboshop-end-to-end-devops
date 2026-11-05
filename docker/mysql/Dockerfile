FROM golang:1.26.10-alpine AS gosu-builder
RUN apk add --no-cache git
RUN git clone --depth 1 --branch 1.20 https://github.com/tianon/gosu.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gosu .

FROM mysql:8

# MySQL Shell is not used by the RoboShop database container; remove its
# bundled Python runtime and optional client tooling from the server image.
RUN if rpm -q mysql-shell >/dev/null 2>&1; then rpm -e mysql-shell; fi
COPY --from=gosu-builder /gosu /usr/local/bin/gosu
COPY db/ /docker-entrypoint-initdb.d/
