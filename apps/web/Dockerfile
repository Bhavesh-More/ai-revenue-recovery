# Dockerfile for Next.js web application
FROM node:20-alpine AS base
WORKDIR /app

# Enable Corepack & Yarn Berry
RUN corepack enable

# Copy workspace configuration and dependency lockfiles
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn .yarn

# Copy workspace packages and web app
COPY packages ./packages
COPY apps/web ./apps/web

# Install dependencies and build web app
RUN yarn install
RUN yarn workspace web build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["yarn", "workspace", "web", "start"]
