FROM python:3.12-slim-bookworm
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends build-essential python3-dev libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY payment.ini .
COPY *.py .
RUN python -m pip install --no-cache-dir --upgrade pip \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip check \
    && python -c "import importlib.util; assert importlib.util.find_spec('setuptools') is None, 'setuptools must not be present in the runtime image'" \
    && apt-get purge -y --auto-remove build-essential python3-dev \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 8080
CMD ["uwsgi", "--ini", "payment.ini"]
