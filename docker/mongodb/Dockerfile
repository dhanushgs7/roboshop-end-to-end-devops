FROM golang:1.26.10-alpine AS gosu-builder
RUN apk add --no-cache git
RUN git clone --depth 1 --branch 1.20 https://github.com/tianon/gosu.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /gosu .

FROM mongo:7.0
# js-yaml was installed into this custom path by an earlier remediation attempt;
# MongoDB's entrypoint and RoboShop initialization scripts do not use it.
RUN rm -rf /opt/js-yaml
COPY --from=gosu-builder /gosu /usr/local/bin/gosu

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -f /usr/bin/bsondump /usr/bin/mongodump /usr/bin/mongoexport /usr/bin/mongofiles \
              /usr/bin/mongoimport /usr/bin/mongorestore /usr/bin/mongostat /usr/bin/mongotop \
    && rm -rf /var/lib/apt/lists/*

COPY *.js /docker-entrypoint-initdb.d/
