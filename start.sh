#!/bin/bash

# AI Assistant Startup Script (Linux/Mac/WSL)
set -e

echo "🚀 Starting AI Assistant Monorepo..."

# 1. Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Error: Docker is not running. Please start Docker and try again."
  exit 1
fi

# 2. Hoist workspaces and install dependencies
echo "📦 Installing dependencies and hoisting workspaces..."
npm install

# 3. Start the infrastructure
echo "🐳 Building and starting Docker containers..."
docker-compose -f infra/docker/docker-compose.yml up -d --build

echo "✅ All services are starting!"
echo "-------------------------------------------------------"
echo "Services are available at:"
echo "- Control Plane:       http://localhost:3000"
echo "- Dashboard (Next.js): http://localhost:8080"
echo "- API Server:          http://localhost:3001"
echo "- AI Brain:            http://localhost:3003"
echo "- Prometheus:          http://localhost:19090"
echo "- Grafana:             http://localhost:13000"
echo "- cAdvisor:            http://localhost:18080"
echo "-------------------------------------------------------"
echo "Use 'docker-compose -f infra/docker/docker-compose.yml logs -f' to view logs."
