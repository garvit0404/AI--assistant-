#!/bin/bash

# --------------------------------------------------
# AI Assistant Environment Startup Script
# --------------------------------------------------

PROJECT_ROOT="/d/AI-DOCKER/AI-Assistant"
COMPOSE_FILE="$PROJECT_ROOT/infra/docker/docker-compose.yml"

echo "----------------------------------------"
echo "Starting AI Assistant Environment"
echo "----------------------------------------"

# Move to project root
cd "$PROJECT_ROOT" || exit

echo "Working directory:"
pwd

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "❌ Docker Desktop is not running."
  echo "Please start Docker Desktop first."
  exit 1
fi

echo "✅ Docker engine detected."

# Start containers
echo ""
echo "🚀 Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "----------------------------------------"
echo "Environment Started"
echo "----------------------------------------"

echo "Dashboard:"
echo "http://localhost:8080"

echo ""
echo "API:"
echo "http://localhost:3000"

echo ""
echo "Use this command to view logs:"
echo "docker compose -f $COMPOSE_FILE logs -f"