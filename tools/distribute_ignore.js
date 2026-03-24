const fs = require('fs');
const path = require('path');

const rootIgnore = fs.readFileSync('d:\\AI-DOCKER\\AI-Assistant\\.dockerignore', 'utf8');

const targetDirs = [
  'services/ai-brain',
  'services/api-server',
  'services/intent-parser',
  'services/planner-agent',
  'services/policy-engine',
  'services/permission-engine',
  'services/observer-agent',
  'services/executor-agent',
  'apps/dashboard-next',
  'apps/telegram-bot',
  'infra/sandbox'
];

for (const dir of targetDirs) {
  const fullPath = path.join('d:\\AI-DOCKER\\AI-Assistant', dir);
  if (fs.existsSync(fullPath)) {
    fs.writeFileSync(path.join(fullPath, '.dockerignore'), rootIgnore);
    console.log(`Copied .dockerignore to ${dir}`);
  }
}
