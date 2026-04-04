# BUILD_CONTEXT: ../../
FROM node:22-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/docker-monitor/package.json ./apps/docker-monitor/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/permission-model/package.json ./packages/permission-model/
COPY packages/task-model/package.json ./packages/task-model/
COPY packages/tool-model/package.json ./packages/tool-model/
COPY packages/tool-registry-sdk/package.json ./packages/tool-registry-sdk/

RUN npm ci --workspace docker-monitor --include-workspace-root --ignore-scripts --legacy-peer-deps

COPY apps/docker-monitor ./apps/docker-monitor
COPY packages ./packages

ENV NEXT_TELEMETRY_DISABLED=1
ENV NO_UPDATE_NOTIFIER=1
RUN npm run build --workspace docker-monitor

# Stage 2: Runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3015

RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app

COPY --from=builder /app ./

USER appuser
EXPOSE 3015

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3015/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["npm", "start", "--workspace", "docker-monitor"]
