# YABB: the app plus its server. No npm packages, so this is just Node and the files.
FROM node:24-alpine
WORKDIR /yabb
COPY package.json ./
COPY app ./app
COPY server/server.js ./server/server.js
COPY server/public ./server/public
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION DATA_DIR=/data HOST=127.0.0.1 PORT=8080 NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server/server.js"]
