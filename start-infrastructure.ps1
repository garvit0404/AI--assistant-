# start-infrastructure.ps1
# Starts required AI-OS microservices for development/readiness audit

$services = @(
    @{ name = "Task Queue"; path = "services/task-queue/src/index.js"; port = 3013 },
    @{ name = "Tool Registry"; path = "services/tool-registry/src/index.js"; port = 3012 },
    @{ name = "Observer Agent"; path = "services/observer-agent/src/index.js"; port = 3014 }
)

foreach ($service in $services) {
    echo "Starting $($service.name) on port $($service.port)..."
    Start-Process -NoNewWindow -FilePath "node" -ArgumentList $service.path
}

echo "Infrastructure services started."
echo "Check your dashboard for readiness."
