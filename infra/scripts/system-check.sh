#!/bin/bash
# system-check.sh
echo "Checking system requirements..."

# Check env variables
ENV_FILE="../../.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: .env file not found at $ENV_FILE. Will use defaults or container env."
fi

# We source the .env file carefully if it exists to get the ports
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' $ENV_FILE | xargs)
fi

PORT_API=${API_PORT:-3001}
PORT_DB=${MONGO_PORT:-27017}
PORT_REDIS=${REDIS_PORT:-6379}
PORT_DASHBOARD=${DASHBOARD_PORT:-8080}

# Check if Docker is running
if ! docker ps > /dev/null 2>&1 && ! docker.exe ps > /dev/null 2>&1; then
  echo "Error: Docker does not appear to be running."
  exit 1
fi
echo "Docker is running."

# Simple port check using netstat or ss based on availability
check_port() {
  local port=$1
  if netstat -ano 2>/dev/null | grep -q ":$port "; then
    echo "Error: Port $port is already in use. Aborting."
    exit 1
  fi
}

echo "Checking ports..."
# This might not work identically on Windows Git Bash, so we do a softer approach
if command -v netstat > /dev/null 2>&1; then
  check_port $PORT_API
  check_port $PORT_DB
  check_port $PORT_REDIS
  check_port $PORT_DASHBOARD
  echo "All required ports are available."
else
  echo "netstat not available, skipping port check."
fi

echo "System check passed."