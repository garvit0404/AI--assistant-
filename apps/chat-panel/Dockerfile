# BUILD_CONTEXT: ../../
FROM node:22-slim AS builder
WORKDIR /app

# Copy essential monorepo meta files
COPY package.json package-lock.json ./

# Copy ALL workspace package.json files for installation
# This is a bit manual but necessary for workspace resolution in a slim container
COPY apps/chat-panel/package.json ./apps/chat-panel/
COPY packages/shared-config/package.json ./packages/shared-config/
COPY packages/permission-model/package.json ./packages/permission-model/
COPY packages/task-model/package.json ./packages/task-model/
COPY packages/tool-model/package.json ./packages/tool-model/
COPY packages/tool-registry-sdk/package.json ./packages/tool-registry-sdk/

# Install dependencies (ignoring scripts for speed)
RUN npm ci --workspace chat-panel --include-workspace-root --ignore-scripts --legacy-peer-deps

# Copy source code
COPY apps/chat-panel ./apps/chat-panel
COPY packages ./packages

# Build Next.js
# We need NEXT_PUBLIC variables at build time if they aren't server-side only
# But for now, we'll try to keep them runtime-capable where possible
ENV NEXT_TELEMETRY_DISABLED=1
ENV NO_UPDATE_NOTIFIER=1
RUN npm run build --workspace chat-panel

# Stage 2: Runner
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app

# Copy the built standalone App Router output
# (Note: Requires "output: 'standalone'" in next.config.ts for best efficiency)
# But for a simple setup, we'll copy the whole app
COPY --from=builder /app ./

USER appuser
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start the dev server for now since we haven't configured standalone yet
# or use next start
CMD ["npm", "start", "--workspace", "chat-panel"]
