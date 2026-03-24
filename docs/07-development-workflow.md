# Development Workflow

## 1. Start Infrastructure
Run the core database and cache services:
```bash
cd infra/scripts
./dev.sh up
```

## 2. Start Backend
Run the API server:
```bash
cd services/api-server
npm install
node index.js
```

## 3. Start Frontend
Run the management dashboard:
```bash
cd apps/dashboard-next
npm install
npm run dev
```

## 4. Test and Verify
- Open Dashboard: `http://localhost:8080`
- Check API Health: `http://localhost:3000/health`
