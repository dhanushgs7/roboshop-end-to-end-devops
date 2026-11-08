FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY package.json .
COPY *.js .
RUN npm install --omit=dev --no-audit --no-fund
EXPOSE 8080
CMD ["node", "server.js"]
USER node
