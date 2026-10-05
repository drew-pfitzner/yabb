# YNABB: the app plus its server. No npm packages, so this is just Node and the files.
FROM node:24-alpine
# tzdata so "2am" means 2am in Griffith
RUN apk add --no-cache tzdata
WORKDIR /ynabb
COPY package.json ./
COPY app ./app
COPY server/server.js server/backup.js ./server/
COPY server/public ./server/public
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION DATA_DIR=/data HOST=127.0.0.1 PORT=8080 NODE_ENV=production TZ=Australia/Sydney
RUN mkdir -p /data /backups /offsite && chown node:node /data /backups /offsite
USER node
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server/server.js"]
