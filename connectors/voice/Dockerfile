# BUILD_CONTEXT: ../../
FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY connectors/voice/package.json ./connectors/voice/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/permission-model/package.json ./packages/permission-model/
COPY packages/task-model/package.json ./packages/task-model/
# tool-registry renamed to tool-registry-sdk
COPY packages/tool-registry-sdk/package.json ./packages/tool-registry-sdk/

# Install dependencies for the specific workspace
RUN npm ci --workspace voice-connector --include-workspace-root --omit=dev && \
    mkdir -p /app/connectors/voice/node_modules

# Stage 2: Runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3016

# Create non-root user and uploads directory
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    mkdir -p /app/connectors/voice/uploads && \
    chown -R appuser:appuser /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy service source
COPY connectors/voice/src ./connectors/voice/src
COPY connectors/voice/package.json ./connectors/voice/package.json

USER appuser
EXPOSE 3016

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3016/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "connectors/voice/src/index.js"]
