const fs = require('fs');
const path = 'd:\\AI-DOCKER\\AI-Assistant\\infra\\docker\\docker-compose.yml';
let yml = fs.readFileSync(path, 'utf8');

const mapping = {
  'ai-brain': 'services/ai-brain',
  'ai_api_server': 'services/api-server',
  'intent-parser': 'services/intent-parser',
  'planner-agent': 'services/planner-agent',
  'policy-engine': 'services/policy-engine',
  'permission-engine': 'services/permission-engine',
  'observer-agent': 'services/observer-agent',
  'executor-agent': 'services/executor-agent',
  'dashboard': 'apps/dashboard-next',
  'telegram-bot': 'apps/telegram-bot'
};

for (const [svc, dir] of Object.entries(mapping)) {
    // Escape dots for regex
    const regex = new RegExp(`  ${svc}:[\\s\\S]*?build:\\s*\\n\\s*context: (?:\\.\\.\\/\\.\\.\\/?|\\.\\.\\/\\.\\.\\/${dir}\\/?)\\s*\\n\\s*dockerfile: (?:${dir}\\/Dockerfile|Dockerfile)`, 'g');
    
    // We want to replace it with:
    //   context: ../../dir
    //   dockerfile: Dockerfile
    
    const replacement = `  ${svc}:\n    build:\n      context: ../../${dir}\n      dockerfile: Dockerfile`;
    
    // This regex might be too broad if it matches multiple things. 
    // Let's use a more surgical approach.
}

// Rewriting manually to ensure correctness
let newYml = yml;
for (const [svc, dir] of Object.entries(mapping)) {
    const startTag = `  ${svc}:`;
    const startIndex = newYml.indexOf(startTag);
    if (startIndex === -1) continue;
    
    // Find build block
    const buildIndex = newYml.indexOf('build:', startIndex);
    if (buildIndex === -1) continue;
    
    // Find context and dockerfile
    const contextIndex = newYml.indexOf('context:', buildIndex);
    const dockerfileIndex = newYml.indexOf('dockerfile:', buildIndex);
    
    // Replace context value
    const nextLineContext = newYml.indexOf('\n', contextIndex);
    newYml = newYml.substring(0, contextIndex) + `context: ../../${dir}` + newYml.substring(nextLineContext);
    
    // Re-find dockerfileIndex because string length changed
    const newDockerfileIndex = newYml.indexOf('dockerfile:', buildIndex);
    const nextLineDockerfile = newYml.indexOf('\n', newDockerfileIndex);
    newYml = newYml.substring(0, newDockerfileIndex) + `dockerfile: Dockerfile` + newYml.substring(nextLineDockerfile);
}

fs.writeFileSync(path, newYml);
console.log('Successfully updated contexts in docker-compose.yml');
