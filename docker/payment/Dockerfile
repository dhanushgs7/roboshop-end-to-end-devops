FROM python:3.12-slim-bookworm
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends build-essential python3-dev libexpat1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY payment.ini .
COPY *.py .
RUN pip install --no-cache-dir --upgrade pip 'setuptools>=78.1.1' \
    && pip install --no-cache-dir -r requirements.txt \
    && python -m pip uninstall -y setuptools \
    && python -m pip install --no-cache-dir --no-deps --ignore-installed 'setuptools==78.1.1' \
    && python -c "import setuptools; assert setuptools.__version__ == '78.1.1', setuptools.__version__" \
    && apt-get purge -y --auto-remove build-essential python3-dev \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 8080
CMD ["uwsgi", "--ini", "payment.ini"]
