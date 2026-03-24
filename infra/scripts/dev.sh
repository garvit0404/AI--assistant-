#!/bin/bash

# Change to the script's directory so paths are reliable
cd "$(dirname "$0")"

COMPOSE_FILE="../docker/docker-compose.yml"

run_system_check() {
    bash ./system-check.sh
    if [ $? -ne 0 ]; then
        echo "System check failed. Aborting."
        exit 1
    fi
}

case "$1" in
  up)
    run_system_check
    docker compose -f $COMPOSE_FILE up --build -d
    ;;
  down)
    docker compose -f $COMPOSE_FILE down
    ;;
  logs)
    docker compose -f $COMPOSE_FILE logs -f
    ;;
  rebuild)
    run_system_check
    docker compose -f $COMPOSE_FILE up --build
    ;;
  *)
    echo "Usage: bash infra/scripts/dev.sh {up|down|logs|rebuild}"
    ;;
esac