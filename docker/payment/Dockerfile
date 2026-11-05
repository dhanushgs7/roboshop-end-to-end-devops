FROM python:3.12-slim-bookworm AS builder
WORKDIR /build

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends build-essential python3-dev libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip check \
    && python -m pip uninstall -y setuptools \
    && find /usr/local/lib/python3.12 -type d -name 'setuptools-*.dist-info' -prune -exec rm -rf {} + \
    && find /usr/local/lib/python3.12 -type f \( -name 'setuptools-*.whl' -o -name 'setuptools-*.egg-info' \) -delete \
    && python -c "import importlib.util; assert importlib.util.find_spec('setuptools') is None, 'setuptools remains in builder runtime'"

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libbz2-1.0 \
        libcrypt1 \
        libexpat1 \
        libffi8 \
        libgcc-s1 \
        libgdbm6 \
        liblzma5 \
        libncursesw6 \
        libreadline8 \
        libsqlite3-0 \
        libssl3 \
        libstdc++6 \
        libuuid1 \
        zlib1g \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local /usr/local
COPY payment.ini .
COPY *.py .

ENV PATH="/usr/local/bin:${PATH}" \
    LD_LIBRARY_PATH="/usr/local/lib" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN set -eux; \
    python -m pip check; \
    python -c "import flask, pika, prometheus_client, opentracing, instana, requests; import importlib.util; assert importlib.util.find_spec('setuptools') is None"; \
    ldd /usr/local/bin/python3.12; \
    ldd /usr/local/bin/uwsgi; \
    ! ldd /usr/local/bin/python3.12 2>&1 | grep -q "not found"; \
    ! ldd /usr/local/bin/uwsgi 2>&1 | grep -q "not found"; \
    test -z "$(find /usr/local/lib/python3.12 \( -type d -name 'setuptools-*.dist-info' -o -type f -name 'setuptools-*.whl' -o -type f -name 'setuptools-*.egg-info' \) -print -quit)"

EXPOSE 8080
CMD ["uwsgi", "--ini", "payment.ini"]
