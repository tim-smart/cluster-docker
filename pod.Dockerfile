FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
COPY dist/pod.js /app/pod.js

RUN corepack pnpm install --frozen-lockfile --prod

CMD ["node", "pod.js"]
