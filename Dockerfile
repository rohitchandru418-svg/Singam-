# Startup Singam ERP — production image.
#
# Node 24 is required: the app persists through the built-in `node:sqlite` module, which is
# only available on modern Node. The SQLite file lives on a mounted volume (SINGAM_DB_PATH),
# so data survives image rebuilds and container restarts.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The build must not touch the database; it only compiles the app.
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=12000 \
    SINGAM_DB_PATH=/data/singam.db
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts
RUN mkdir -p /data
EXPOSE 12000
# A fresh volume is seeded on first boot by src/lib/db/client.ts.
VOLUME ["/data"]
CMD ["npm", "run", "start"]
