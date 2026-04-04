const INTENT_PATTERNS = [
    {
        intent: 'FILE_WRITE',
        tool: 'filesystem.write',
        confidence: 0.97,
        patterns: [
            /\b(create|generate|write|save)\b.*\bfile(s)?\b/i,
            /\bwrite\s+(some\s+)?code\b/i,
            /\b(create|generate)\b.*\b(script|module|component|function)(s)?\b/i,
            /\boutput\s+to\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bappend\s+(to\s+)?\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\btouch\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bsave\s+to\s+\S+/i,
            /\boverwrite\b.*\bfile(s)?\b/i,
            /\bupdate\b.*\b(content|code)\b/i,
        ]
    },
    {
        intent: 'SYSTEM_EXEC',
        tool: 'system.exec',
        confidence: 0.98,
        patterns: [
            /\brun\s+(the\s+)?(command|cmd|script|program|binary)\b/i,
            /\bexecute\s+(a\s+)?(command|script|program|binary)\b/i,
            /\blaunch\s+(the\s+)?(process|script|program|binary)\b/i,
            /\brun\s+`[^`]+`/i,
            /\brun\s+"[^"]+"/i,
            /\bnpm\s+(run|install|build|start)\b/i,
            /\bsh\s+\S+\.sh\b/i,
            /\bbash\s+\S+\.sh\b/i,
            /\bnode\s+\S+\.(js|mjs)\b/i,
            /\bdocker\s+(run|ps|stop|start|build)\b/i,
            /\blist\s+(docker\s+)?containers\b/i,
            /\b(show|list|get)\s+(running\s+)?containers\b/i,
            /\bwhat\s+(containers|docker)\s+(are\s+)?(running|active)\b/i,
            /\bpip\s+install\b/i,
            /\bpython\s+\S+\.py\b/i,
            /\brestart\s+(the\s+)?(server|service|system)\b/i,
        ]
    },
    {
        intent: 'FILE_DELETE',
        tool: 'filesystem.delete',
        confidence: 0.98,
        patterns: [
            /\b(delete|remove|clean|purge|destroy)\b.*\b(file|directory|folder|bin)(s|ies)?\b/i,
            /\bpurge\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
        ]
    },
    {
        intent: 'WEB_SEARCH',
        tool: 'browser.search',
        confidence: 0.90,
        patterns: [
            /\bsearch\s+(for|the\s+web\s+for)?\b/i,
            /\bgoogle\s+(for)?\b/i,
            /\bfind\s+information\s+(on|about)\b/i,
            /\blook\s+up\b/i,
            /\bwhat\s+is\b.*\?/i,
        ]
    },
    {
        intent: 'FILE_READ',
        tool: 'filesystem.read',
        confidence: 0.92,
        patterns: [
            /\b(read|show|open|list|print)\b.*\b(file|content|directory|folder)s?\b/i,
            /\bcat\s+\S+/i,
            /\.\.\//, 
            /\/etc\/passwd/,
        ]
    },
];

function parseIntent(prompt) {
    const p = prompt.trim();
    let best = null;
    let bestScore = 0;

    for (const rule of INTENT_PATTERNS) {
        let matchCount = 0;
        for (const pattern of rule.patterns) {
            if (pattern.test(p)) matchCount++;
        }
        if (matchCount > 0) {
            const score = rule.confidence + (matchCount - 1) * 0.005;
            if (score > bestScore) {
                bestScore = score;
                best = { intent: rule.intent, tool: rule.tool, confidence: Math.min(score, 0.99) };
            }
        }
    }

    if (!best || bestScore < 0.6) {
        return { intent: 'GENERAL_CHAT', tool: null, confidence: 0.5 };
    }

    return best;
}

function policyCheck(intent, prompt) {
    const violations = [];
    const SAFE_BASE = "/workspace";

    if (intent.intent.startsWith('FILE')) {
        if (!prompt.includes(SAFE_BASE)) {
            violations.push('operation outside workspace');
        }
    }

    const RESTRICTED_PATHS = ['/etc/passwd', '/etc/shadow', '/root', '/var/run/docker.sock', '.env', 'config.js'];
    if (RESTRICTED_PATHS.some(path => prompt.includes(path))) {
        violations.push(`Access to restricted path: ${prompt}`);
    }

    return violations;
}

const testInputs = [
    "list docker containers",
    "show running containers",
    "hello",
    "delete all files",
    "../../etc/passwd"
];

const results = testInputs.map(input => {
    const intent = parseIntent(input);
    const violations = policyCheck(intent, input);
    const decision = violations.length > 0 ? "REJECT" : "ALLOW";
    
    return {
        input,
        detected_intent: intent.intent,
        confidence: intent.confidence,
        policy_decision: decision,
        execution_result: decision === "ALLOW" ? "SUCCESS (Simulated)" : "BLOCKED",
        violations: violations.length > 0 ? violations : undefined
    };
});

console.log(JSON.stringify(results, null, 2));
