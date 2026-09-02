# Dockerfile for @recovery/api
FROM node:20-alpine AS base
WORKDIR /app

# Enable Corepack & Yarn Berry
RUN corepack enable

# Copy workspace configuration and dependency lockfiles
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn .yarn

# Copy workspace packages and api app
COPY packages ./packages
COPY apps/api ./apps/api

# Install dependencies and build monorepo packages & api app
RUN yarn install
RUN yarn workspace @recovery/api build

EXPOSE 4000

ENV NODE_ENV=production
ENV API_PORT=4000
ENV API_HOST=0.0.0.0

CMD ["yarn", "workspace", "@recovery/api", "start"]
