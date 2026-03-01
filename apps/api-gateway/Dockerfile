FROM node:20-alpine AS development

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install

COPY . .

CMD ["pnpm", "run", "start:dev", "api-gateway"]