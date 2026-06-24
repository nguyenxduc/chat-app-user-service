# syntax=docker/dockerfile:1


FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

WORKDIR /app

FROM base AS deps

# Copy workspace configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./

# Copy package/json file for all needed packages
COPY packages/common/package.json ./packages/common/
COPY services/user-service/package.json ./services/user-service/

#Install Dependencies
RUN pnpm install --frozen-lockfile


FROM deps AS builder

# Copy source code
COPY packages/common ./packages/common
COPY services/user-service ./services/user-service
COPY proto ./proto

#Build commong packge first
RUN pnpm --filter @chatapp/common build

# Build user-service
RUN pnpm --filter @chatapp/user-service build


FROM node:22-alpine AS prodcution

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# Create non-root user 
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy package.json files
COPY packages/common/package.json ./packages/common/
COPY services/user-service/package.json ./services/user-service/


# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from builder
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/proto ./proto

# Change ownership to non(root)
RUN chown -R nodeuser:nodejs /app

USER nodeuser

ENV NODE_ENV=production
ENV USER_SERVICE_PORT=4001
ENV OTEL_SERVICE_NAME=user-service

EXPOSE 4001
EXPOSE 9464

WORKDIR /app/services/user-service

CMD [ "node", "--import", "./dist/tracing.js", "dist/index.js" ]