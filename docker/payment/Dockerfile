FROM python:3.12-slim-bookworm
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends build-essential python3-dev libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY payment.ini .
COPY *.py .
RUN python -m pip install --no-cache-dir --upgrade pip 'setuptools==84.2.1' \
    && python -m pip install --no-cache-dir -r requirements.txt \
    && python -c "import setuptools; assert setuptools.__version__ == '84.2.1', setuptools.__version__" \
    && python -m pip check \
    && apt-get purge -y --auto-remove build-essential python3-dev \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 8080
CMD ["uwsgi", "--ini", "payment.ini"]
