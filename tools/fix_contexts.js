const fs = require('fs');

const composePath = 'd:\\AI-DOCKER\\AI-Assistant\\infra\\docker\\docker-compose.yml';
let yml = fs.readFileSync(composePath, 'utf8');

const servicesToFix = [
  { name: 'ai-brain', path: 'services/ai-brain' },
  { name: 'ai_api_server', path: 'services/api-server' },
  { name: 'intent-parser', path: 'services/intent-parser' },
  { name: 'planner-agent', path: 'services/planner-agent' },
  { name: 'policy-engine', path: 'services/policy-engine' },
  { name: 'permission-engine', path: 'services/permission-engine' },
  { name: 'observer-agent', path: 'services/observer-agent' },
  { name: 'executor-agent', path: 'services/executor-agent' },
  { name: 'dashboard', path: 'apps/dashboard-next' },
  { name: 'telegram-bot', path: 'apps/telegram-bot' },
];

for (const svc of servicesToFix) {
  // Regex to match context: ../../ and dockerfile: ...
  const regex = new RegExp(`(  ${svc.name}:[\\s\\S]*?build:\\s*\\n\\s*context: )\\.\\.\\/\\.\\.(\\s*\\n\\s*dockerfile: )[^\\n]*`, 'g');
  yml = yml.replace(regex, `$1../../${svc.path}$2Dockerfile`);
}

fs.writeFileSync(composePath, yml);
console.log('Fixed contexts in docker-compose.yml');
