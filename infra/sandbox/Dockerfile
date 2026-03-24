# BUILD_CONTEXT: ../../
FROM ubuntu:22.04

# Avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js 22 via NodeSource and other tools
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    git \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create isolated sandboxuser
RUN useradd -m -s /bin/bash sandboxuser

# Setup workspace
RUN mkdir -p /home/sandboxuser/workspace && \
    chown -R sandboxuser:sandboxuser /home/sandboxuser/workspace

WORKDIR /home/sandboxuser/workspace

# Copy any bridge code if it exists (Optional, depending on how it's used)
# COPY infra/sandbox/package*.json /app/
# WORKDIR /app
# RUN npm install
# COPY infra/sandbox/src/ /app/src/
# RUN chown -R sandboxuser:sandboxuser /app

USER sandboxuser

# The sandbox is for execution, usually kept alive by a process or bridge
# If it's the bridge from the previous version:
# CMD ["node", "/app/src/bridge.js"]

# Just keep it alive or run as needed
CMD ["tail", "-f", "/dev/null"]
