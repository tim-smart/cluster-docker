FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN corepack pnpm install --frozen-lockfile --prod
COPY dist/pod.js /app/pod.js

CMD ["node", "pod.js"]
