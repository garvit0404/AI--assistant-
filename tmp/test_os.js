const INTENT_PATTERNS = [
    {
        intent: 'FILE_WRITE',
        tool: 'filesystem.write',
        confidence: 0.97,
        patterns: [
            /\bcreate\s+(a\s+)?(new\s+)?file\b/i,
            /\bwrite\s+(to\s+)?(a\s+)?file\b/i,
            /\bsave\s+(a\s+)?file\b/i,
            /\bgenerate\s+(a\s+)?(new\s+)?file\b/i,
            /\bwrite\s+(some\s+)?code\b/i,
            /\bcreate\s+(a\s+)?(script|module|component|function)\b/i,
            /\boutput\s+to\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bappend\s+(to\s+)?\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\btouch\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bsave\s+to\s+\S+/i,
            /\boverwrite\s+(the\s+)?file\b/i,
            /\bupdate\s+(the\s+)?(content|code)\b/i,
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
            /\bdelete\s+(the\s+)?(file|directory|folder)\b/i,
            /\bremove\s+(the\s+)?(file|directory|folder)\b/i,
            /\bclean\s+(up\s+)?(file|directory|folder)\b/i,
            /\bpurge\s+\S+\.(js|ts|py|txt|json|md|sh)\b/i,
            /\bdestroy\s+(the\s+)?(file|directory)\b/i,
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
            /\bread\s+(the\s+)?(file|content)\b/i,
            /\bshow\s+(me\s+)?(the\s+)?(file|content)\b/i,
            /\bopen\s+(the\s+)?(file)\b/i,
            /\blist\s+(files|directory|folder)\b/i,
            /\bcat\s+\S+/i,
            /\bprint\s+(the\s+)?content/i,
        ]
    },
    {
        intent: 'HTTP_FETCH',
        tool: 'http.fetch',
        confidence: 0.88,
        patterns: [
            /\bfetch\s+(from\s+)?(https?:\/\/\S+|\burl\b|\bapi\b)\b/i,
            /\bmake\s+(a\s+)?(get|post|put|patch|delete)\s+request\b/i,
            /\bcall\s+(the\s+)?(api|endpoint|url)\b/i,
            /\bdownload\s+(from\s+)?(https?:\/\/\S+)\b/i,
        ]
    }
];

function parseIntent(prompt) {
    const p = prompt.trim();
    if (!p) return { intent: 'INVALID_INPUT', tool: null, confidence: 0 };
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
    return best || { intent: 'GENERAL_CHAT', tool: null, confidence: 0.5 };
}

const RESTRICTED_PATHS = ['/etc/passwd', '/etc/shadow', '/root', '/var/run/docker.sock', '.env', 'config.js'];

function policyCheck(intent, prompt) {
    const violations = [];
    
    // Path escape detection
    const pathMatch = prompt.match(/(\.\.\/|\/etc\/|\/root\/|\.env|config\.js)/i);
    if (pathMatch) {
        violations.push(`path traversal or restricted path detected: ${pathMatch[0]}`);
    }

    // Critical deletion check
    if (intent.intent === 'FILE_DELETE' && (prompt.includes('all') || prompt.includes('system'))) {
        violations.push('unsafe path / critical operation');
    }

    // Command injection / Restricted command
    if (intent.intent === 'SYSTEM_EXEC') {
        const unsafeChars = [';', '&&', '||', '|', '>', '<', '`', '$'];
        if (unsafeChars.some(char => prompt.includes(char))) {
             violations.push('Unsafe command characters detected');
        }
        if (prompt.includes('rm -rf /')) {
             violations.push('restricted command execution');
        }
    }

    return {
        decision: violations.length > 0 ? 'REJECT' : 'ALLOW',
        violations
    };
}

const testCases = [
    "list docker containers",
    "hello",
    "delete all files"
];

const results = testCases.map(input => {
    const intent = parseIntent(input);
    const policy = policyCheck(intent, input);
    
    let execution = "skipped";
    if (policy.decision === 'ALLOW') {
        if (intent.intent === 'GENERAL_CHAT') execution = "success (message only)";
        else execution = "success";
    } else {
        execution = "failed";
    }

    return {
        input,
        intent: intent.intent,
        confidence: intent.confidence,
        policy_decision: policy.decision,
        execution,
        tool_used: intent.tool || "N/A",
        error: policy.violations.length > 0 ? policy.violations[0] : "none",
        violations: policy.violations
    };
});

console.log(JSON.stringify(results, null, 2));
