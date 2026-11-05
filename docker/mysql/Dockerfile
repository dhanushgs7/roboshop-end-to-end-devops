FROM golang:1.26.10-alpine AS gosu-builder
RUN apk add --no-cache git
RUN git clone --depth 1 --branch 1.20 https://github.com/tianon/gosu.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gosu .

FROM mysql:8
COPY --from=gosu-builder /gosu /usr/local/bin/gosu
COPY db/ /docker-entrypoint-initdb.d/
