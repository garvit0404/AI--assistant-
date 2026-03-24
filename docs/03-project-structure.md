# Project Structure

```text
AI-Assistant/
├── apps/               # UI applications
│   └── dashboard-next/ # Next.js management UI
├── services/           # Backend runtime services
│   └── api-server/     # Node.js backend
├── packages/           # Shared libraries and logic
│   ├── core/           # Core logic libraries
│   ├── security/       # Security and Permission modules
│   └── integrations/   # External API integrations
├── infra/              # Infrastructure and automation
│   ├── docker/         # Container configuration
│   │   ├── docker-compose.yml
│   │   └── .env
│   └── scripts/        # DevOps automation scripts
├── workspace/          # Isolated sandbox for AI file operations
└── docs/               # Technical documentation
```
