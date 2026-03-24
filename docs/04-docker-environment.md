# Docker Environment

The AI assistant runs its core services and tool execution inside a Dockerized environment to ensure isolation and reproducibility.

## Services

- **api-server**: Orchestrates the AI's actions.
- **mongodb**: Stores persistent memory and history.
- **redis**: Handles session caching and fast memory.

## Benefits

- **Isolation**: Tool execution is separated from the host OS.
- **Reproducibility**: Consistent environment across different development machines.
- **Sandboxed Access**: AI agents only see what's inside the container/volume.

# Commands (using scripts)

```bash
cd infra/scripts

# Start all services
./dev.sh up

# Stop all services
./dev.sh down

# View logs
./dev.sh logs

# Rebuild
./dev.sh rebuild
```

# Manual Commands

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```
