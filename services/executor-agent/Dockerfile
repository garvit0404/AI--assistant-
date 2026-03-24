# BUILD_CONTEXT: ../../
FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/control-plane/package.json ./apps/control-plane/
COPY apps/dashboard-next/package.json ./apps/dashboard-next/
COPY apps/telegram-bot/package.json ./apps/telegram-bot/
COPY services/ai-brain/package.json ./services/ai-brain/
COPY services/api-server/package.json ./services/api-server/
COPY services/intent-parser/package.json ./services/intent-parser/
COPY services/planner-agent/package.json ./services/planner-agent/
COPY services/executor-agent/package.json ./services/executor-agent/
COPY services/observer-agent/package.json ./services/observer-agent/
COPY services/permission-engine/package.json ./services/permission-engine/
COPY services/policy-engine/package.json ./services/policy-engine/
COPY services/context-builder/package.json ./services/context-builder/
COPY services/task-queue/package.json ./services/task-queue/
COPY services/tool-registry/package.json ./services/tool-registry/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/permission-model/package.json ./packages/permission-model/
COPY packages/task-model/package.json ./packages/task-model/
COPY packages/tool-model/package.json ./packages/tool-model/
COPY packages/task-queue/package.json ./packages/task-queue/
COPY packages/tool-registry/package.json ./packages/tool-registry/

# Note: Executor agent requires shared packages
COPY packages/ ./packages/

RUN npm ci --workspace executor-agent --include-workspace-root --omit=dev && \
    mkdir -p /app/services/executor-agent/node_modules

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3004

RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app

# Final stage needs dependencies and shared packages
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/executor-agent/node_modules ./services/executor-agent/node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/packages ./packages

COPY services/executor-agent/src ./services/executor-agent/src
COPY services/executor-agent/package.json ./services/executor-agent/package.json
COPY config /app/config

USER appuser
EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))" || \
      node -e "require('http').get('http://localhost:3004/', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "services/executor-agent/src/index.js"]
