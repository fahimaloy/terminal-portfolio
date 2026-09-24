FROM node:24.17.0-alpine AS base

WORKDIR /home/node/app
RUN apk add --no-cache bash
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./

FROM base AS production

ENV NODE_PATH=./build
RUN npm run build
