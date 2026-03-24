const fs = require('fs');

const path = 'd:\\AI-DOCKER\\AI-Assistant\\infra\\docker\\docker-compose.yml';
let yml = fs.readFileSync(path, 'utf8');

const services = [
  'ai-brain', 'ai_api_server', 'intent-parser', 'planner-agent', 
  'policy-engine', 'permission-engine', 'observer-agent', 'executor-agent', 
  'dashboard', 'telegram-bot'
];

for (const svc of services) {
  const regex = new RegExp(`  (${svc}:[\\s\\S]*?)(?=\\n  [a-z]|\\nvolumes:)`);
  yml = yml.replace(regex, (match, p1) => {
    if (!p1.includes('volumes:')) {
      // Add volumes block at the end if not present
      const insertVolumes = `\n    volumes:\n      - logs:/app/logs`;
      return p1 + insertVolumes;
    } else {
      // Add to existing volumes block
      // But wait! Volumes in our compose are written as `volumes: [mongo-data:/data/db]` for mongodb/redis, 
      // but None of the AI services have variables right now.
      return p1;
    }
  });
}

if (!yml.includes('  logs:')) {
  yml = yml.replace('volumes:\n', 'volumes:\n  logs:\n');
}

fs.writeFileSync(path, yml);
console.log('Done');
