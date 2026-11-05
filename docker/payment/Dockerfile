FROM debian:bookworm-slim AS builder

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        libexpat1-dev \
        python3.11 \
        python3.11-dev \
        python3.11-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .

RUN python3.11 -m venv /opt/venv \
    && /opt/venv/bin/python -m pip install --no-cache-dir --upgrade pip \
    && /opt/venv/bin/python -m pip install --no-cache-dir -r requirements.txt \
    && /opt/venv/bin/python -m pip check \
    && /opt/venv/bin/python -c "import flask, pika, prometheus_client, opentracing, instana, requests" \
    && /opt/venv/bin/python -m pip uninstall -y setuptools \
    && rm -rf /opt/venv/lib/python3.11/site-packages/pip \
              /opt/venv/lib/python3.11/site-packages/pip-*.dist-info \
              /opt/venv/lib/python3.11/site-packages/setuptools \
              /opt/venv/lib/python3.11/site-packages/setuptools-*.dist-info \
              /opt/venv/lib/python3.11/site-packages/_distutils_hack \
              /opt/venv/bin/pip /opt/venv/bin/pip3 /opt/venv/bin/pip3.11 \
    && test -z "$(find /opt/venv -iname '*setuptools*' -print -quit)" \
    && test ! -e /opt/venv/lib/python3.11/site-packages/pip

FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        libexpat1 \
        python3.11 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY payment.ini .
COPY *.py .

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN set -eux; \
    python -c "import flask, pika, prometheus_client, opentracing, instana, requests; import importlib.util; assert importlib.util.find_spec('setuptools') is None"; \
    uwsgi --version; \
    ! ldd /opt/venv/bin/uwsgi 2>&1 | grep -q "not found"; \
    test -z "$(find /opt/venv -iname '*setuptools*' -print -quit)"; \
    test ! -e /opt/venv/lib/python3.11/site-packages/pip

EXPOSE 8080
CMD ["uwsgi", "--ini", "payment.ini"]
