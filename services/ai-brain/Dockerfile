# BUILD_CONTEXT: ../../
FROM node:22-slim AS deps
WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy all workspace package.json files to allow npm ci to work with workspaces
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

COPY packages/tool-registry/package.json ./packages/tool-registry/
COPY packages/tool-registry-sdk/package.json ./packages/tool-registry-sdk/

# Install dependencies for the specific workspace
RUN npm ci --workspace ai-brain --include-workspace-root --omit=dev && \
    mkdir -p /app/services/ai-brain/node_modules

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3003

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app

# Copy only necessary files from deps stage (both hoisted and workspace-level)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/ai-brain/node_modules ./services/ai-brain/node_modules
COPY --from=deps /app/package.json ./package.json

# Copy service source
COPY services/ai-brain/src ./services/ai-brain/src
COPY services/ai-brain/package.json ./services/ai-brain/package.json

# Copy centralized config (required by environment config)
COPY config /app/config

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "services/ai-brain/src/index.js"]
