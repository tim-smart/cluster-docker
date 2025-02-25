FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN corepack pnpm install --frozen-lockfile --prod
COPY dist/shardManager.js /app/shardManager.js

CMD ["node", "shardManager.js"]
