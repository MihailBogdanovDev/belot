FROM node:22-slim
WORKDIR /app

# Manifests first so `npm ci` is cached until dependencies change
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
