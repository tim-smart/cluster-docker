FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
COPY dist/shardManager.js /app/shardManager.js

RUN corepack pnpm install --frozen-lockfile --prod

CMD ["node", "shardManager.js"]
