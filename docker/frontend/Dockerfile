FROM nginx:1.28-bookworm
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY static/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
