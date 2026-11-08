FROM node:22-bookworm-slim
WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/*

COPY package.json .
COPY *.js .
RUN npm install --omit=dev --no-audit --no-fund
# npm is a build-time dependency manager; remove its bundled vulnerable dependency tree from runtime images.
RUN rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx
EXPOSE 8080
CMD ["node", "server.js"]
USER node
