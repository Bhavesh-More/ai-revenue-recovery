# Dockerfile for @recovery/worker
FROM node:20-alpine AS base
WORKDIR /app

# Enable Corepack & Yarn Berry
RUN corepack enable

# Copy workspace configuration and dependency lockfiles
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn .yarn

# Copy workspace packages and worker app
COPY packages ./packages
COPY apps/worker ./apps/worker

# Install dependencies and build monorepo packages & worker app
RUN yarn install
RUN yarn workspace @recovery/worker build

ENV NODE_ENV=production

CMD ["yarn", "workspace", "@recovery/worker", "start"]
