const { getAIResponse } = require('../services/ai.service.js');
const logger = require('../utils/logger.js');

const SYSTEM_PROMPT = `You are a cybersecurity security auditor and hardening specialist for an AI system.

Your responsibility is to analyze system operations and produce a structured security hardening plan.

You DO NOT execute actions.
You ONLY generate security policies and recommendations.

CRITICAL OUTPUT RULES
1. Output MUST be valid JSON.
2. Do not include explanations outside JSON.
3. Do not include markdown.
4. Do not include comments.
5. Output exactly one JSON object.

SECURITY OBJECTIVE
Protect the AI system against prompt injection, abuse attacks, excessive requests, unauthorized operations, secret leakage, and system compromise.

OUTPUT SCHEMA
{
  "security_controls": [
    {
      "control_name": string,
      "category": "rate_limiting" | "prompt_injection" | "audit_logging" | "secret_management",
      "description": string,
      "recommended_implementation": string,
      "severity_if_missing": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
  ],
  "monitoring_requirements": [string],
  "security_alerts": [string],
  "confidence": number
}`;

/**
 * Analyzes system architecture or specific requests for security hardening.
 * @param {Object} context - The context to analyze (e.g., architecture details or request payload)
 */
const analyzeSecurityHardening = async (context) => {
    try {
        logger.info('AI Security Analyzer: Generating hardening plan...');

        const prompt = `Analyze the following AI system context and generate a security hardening strategy:
        
        Context:
        ${JSON.stringify(context, null, 2)}
        
        Return a structured security hardening plan in JSON.`;

        const response = await getAIResponse(prompt, SYSTEM_PROMPT);
        const plan = typeof response.choices[0].message.content === 'string'
            ? JSON.parse(response.choices[0].message.content)
            : response.choices[0].message.content;

        return plan;
    } catch (error) {
        logger.error(`Security Analyzer Error: ${error.message}`);
        // Fallback hardening plan
        return {
            security_controls: [
                {
                    control_name: "fallback_rate_limit",
                    category: "rate_limiting",
                    description: "Emergency rate limiting due to analyzer failure",
                    recommended_implementation: "Apply static IP-based 100 req/hr limit",
                    severity_if_missing: "HIGH"
                }
            ],
            monitoring_requirements: ["monitor analyzer health"],
            security_alerts: ["security_analyzer_failed"],
            confidence: 0.5
        };
    }
};

module.exports = { analyzeSecurityHardening };
