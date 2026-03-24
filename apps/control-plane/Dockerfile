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

RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace control-plane

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=builder /app/apps/control-plane/public ./apps/control-plane/public
COPY --from=builder /app/apps/control-plane/.next/standalone ./
COPY --from=builder /app/apps/control-plane/.next/static ./apps/control-plane/.next/static

RUN chown -R appuser:appuser /app

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "apps/control-plane/server.js"]
