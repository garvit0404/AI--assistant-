# ============================================
# AI-Assistant Monorepo - Startup Script
# ============================================

$ErrorActionPreference = "Stop"
$ComposeFile = "infra/docker/docker-compose.yml"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   AI-Assistant Monorepo Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1 - Check Docker is running
Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "      Docker is running." -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Step 2 - Install dependencies from root (npm workspaces hoisting)
Write-Host ""
Write-Host "[2/4] Installing dependencies (npm workspaces)..." -ForegroundColor Yellow
npm install
Write-Host "      Dependencies installed." -ForegroundColor Green

# Step 3 - Build and start all containers
Write-Host ""
Write-Host "[3/4] Building and starting all Docker containers..." -ForegroundColor Yellow
docker-compose -f $ComposeFile up -d --build
Write-Host "      All containers started." -ForegroundColor Green

# Step 4 - Show status
Write-Host ""
Write-Host "[4/4] Container status:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"

# Print URLs
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Services are starting up!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dashboard        -> http://localhost:8080" -ForegroundColor Green
Write-Host "  Control Plane    -> http://localhost:3000" -ForegroundColor Green
Write-Host "  API Server       -> http://localhost:3001" -ForegroundColor Green
Write-Host "  AI Brain         -> http://localhost:3003" -ForegroundColor Green
Write-Host "  Executor Agent   -> http://localhost:3004" -ForegroundColor Green
Write-Host "  Policy Engine    -> http://localhost:3005" -ForegroundColor Green
Write-Host "  Permission Engine-> http://localhost:3006" -ForegroundColor Green
Write-Host "  Intent Parser    -> http://localhost:3007" -ForegroundColor Green
Write-Host "  Planner Agent    -> http://localhost:3008" -ForegroundColor Green
Write-Host "  Observer Agent   -> http://localhost:3009" -ForegroundColor Green
Write-Host "  Telegram Bot     -> http://localhost:3011" -ForegroundColor Green
Write-Host "  Grafana          -> http://localhost:13000  (admin/admin)" -ForegroundColor Green
Write-Host "  Prometheus       -> http://localhost:19090" -ForegroundColor Green
Write-Host "  cAdvisor         -> http://localhost:18080" -ForegroundColor Green
Write-Host ""
Write-Host "  To view logs run:" -ForegroundColor Gray
Write-Host "  docker-compose -f infra/docker/docker-compose.yml logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "  To stop everything run:" -ForegroundColor Gray
Write-Host "  docker-compose -f infra/docker/docker-compose.yml down" -ForegroundColor Gray
Write-Host ""