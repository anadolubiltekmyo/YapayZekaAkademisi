# Build stage
FROM node:20-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production stage
FROM node:20-slim

RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
