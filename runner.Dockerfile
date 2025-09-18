FROM node:alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml /app/
RUN corepack pnpm install --frozen-lockfile --prod
COPY dist/runner.js /app/runner.js
# COPY dist/effect-days/runner.js /app/ed-runner.js
# COPY dist/effect-days/shooter.js /app/ed-shooter.js
# COPY dist/effect-days/slow-shooter.js /app/ed-slow-shooter.js
# COPY dist/effect-days/speed-shooter.js /app/ed-speed-shooter.js

CMD ["node", "runner.js"]
