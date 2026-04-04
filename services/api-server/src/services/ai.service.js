const axios = require('axios');
const logger = require('../utils/logger.js');
const modeManager = require('./modeManager.js');

const BRAIN_URL = process.env.AI_BRAIN_URL || 'http://ai_brain:3003';

const getAIResponse = async (prompt, systemPrompt = 'You are a helpful assistant.', userId = null, jsonMode = true) => {
    const effectiveUserId = userId || `sys_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    try {
        const currentMode = await modeManager.getMode();
        if (currentMode === 'mock') {
            const sys = systemPrompt.toLowerCase();
            const lowerPrompt = prompt.toLowerCase();
            const userPart = lowerPrompt.split('user request:')[1] || lowerPrompt;

            const extractJson = (str) => {
                try {
                    const match = str.match(/\{[\s\S]*\}/);
                    if (!match) return { intent: 'unknown' };
                    return JSON.parse(match[0]);
                } catch (e) {
                    logger.error(`Mock JSON parse error: ${e.message}`);
                    return { intent: 'unknown', error: true };
                }
            };

            // Mapping of keywords in system prompts to mock logic
            if (sys.includes('intent parser')) {
                let intent = { intent: 'FILE_WRITE', language: 'javascript', type: 'create_file', target: 'workspace/hello.js', command: null, confidence: 0.98 };
                if (userPart.includes('delete')) intent.intent = 'FILE_DELETE';
                if (userPart.includes('search')) intent.intent = 'WEB_SEARCH';
                return { choices: [{ message: { content: JSON.stringify(intent) } }] };
            }

            if (sys.includes('permission classifier') || sys.includes('permission evaluator')) {
                const intentObj = extractJson(prompt);
                const level = (intentObj.intent === 'run_command') ? 'CRITICAL' : 'SAFE';
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                intent: intentObj.intent || 'unknown',
                                permission_level: level,
                                reason: "Automated Mock Safety Check",
                                requires_confirmation: level !== 'SAFE',
                                confidence: 1.0,
                                audit_id: "mmi" + Math.random().toString(36).substr(2, 9)
                            })
                        }
                    }]
                };
            }

            if (sys.includes('policy validator')) {
                const intentObj = extractJson(prompt);
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                intent: intentObj.intent || 'unknown',
                                policy_decision: "ALLOW",
                                violations: [],
                                safe_workspace_path: intentObj.target || "workspace/output.js",
                                confidence: 1.0
                            })
                        }
                    }]
                };
            }

            if (sys.includes('execution planner')) {
                const intentObj = extractJson(prompt);
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                intent: intentObj.intent || 'unknown',
                                execution_type: "code_generation",
                                approved_workspace_path: intentObj.target || "workspace/hello.js",
                                execution_plan: [
                                    { step: 1, tool: "filesystem", operation: "create_directory", path: "workspace", description: "Init" },
                                    { step: 2, tool: "code_generator", operation: "generate_secure_code", path: intentObj.target || "workspace/hello.js", description: "Gen" }
                                ],
                                security_checks: ["sandbox_ok"],
                                confidence: 1.0
                            })
                        }
                    }]
                };
            }

            if (sys.includes('memory manager')) {
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                memory_type: "redis",
                                collection_or_key: "session:context",
                                operation: "set",
                                data_category: "session",
                                confidence: 1.0
                            })
                        }
                    }]
                };
            }

            if (sys.includes('browser automation planner')) {
                const isWiki = userPart.includes('wikipedia');
                const isGitHub = userPart.includes('github');
                const isForm = userPart.includes('form') || userPart.includes('fill') || userPart.includes('contact') || userPart.includes('signup');
                const isDownload = userPart.includes('download') || userPart.includes('get file');
                const isBlocked = userPart.includes('payment') || userPart.includes('login') || userPart.includes('financial') ||
                    userPart.includes('password') || userPart.includes('credit card') || userPart.includes('otp') ||
                    userPart.includes('.exe') || userPart.includes('.sh') || userPart.includes('.bin');

                if (isBlocked) {
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    request_type: "reject",
                                    target_url: null,
                                    domain_allowed: false,
                                    browser_workflow: [],
                                    security_checks: ["domain_allowlist_verified", "new_browser_context", "headless_execution", "html_sanitization", "prompt_injection_filter", "timeout_enforced"],
                                    download_path: null,
                                    blocked_reason: "Action involves restricted content or prohibited file types (auth/financial/executables).",
                                    confidence: 0.99
                                })
                            }
                        }]
                    };
                }

                if (isDownload) {
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    request_type: "download_file",
                                    target_url: (userPart.match(/https?:\/\/[^\s]+/) || ["https://github.com/microsoft/playwright/releases/latest"])[0],
                                    domain_allowed: true,
                                    browser_workflow: [
                                        { step: 1, action: "open_page", selector: null, description: "Navigate to the download source" },
                                        { step: 2, action: "download_resource", selector: "a[href*='release']", description: "Download the requested non-executable resource" }
                                    ],
                                    security_checks: ["domain_allowlist_verified", "new_browser_context", "headless_execution", "html_sanitization", "prompt_injection_filter", "timeout_enforced"],
                                    download_path: "workspace/downloads/",
                                    blocked_reason: null,
                                    confidence: 0.94
                                })
                            }
                        }]
                    };
                }

                if (isForm) {
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    request_type: "form_assistance",
                                    target_url: (userPart.match(/https?:\/\/[^\s]+/) || ["https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form"])[0],
                                    domain_allowed: true,
                                    browser_workflow: [
                                        { step: 1, action: "open_page", selector: null, description: "Load the page containing the form" },
                                        { step: 2, action: "extract_text", selector: "form", description: "Identify and classify form fields" }
                                    ],
                                    security_checks: ["domain_allowlist_verified", "new_browser_context", "headless_execution", "html_sanitization", "prompt_injection_filter", "timeout_enforced"],
                                    download_path: null,
                                    blocked_reason: null,
                                    confidence: 0.96
                                })
                            }
                        }]
                    };
                }

                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                request_type: isGitHub ? "scrape" : "navigate",
                                target_url: isWiki ? "https://wikipedia.org/wiki/Docker_(software)" : (isGitHub ? "https://github.com/microsoft/playwright" : (userPart.match(/https?:\/\/[^\s]+/) || ["https://wikipedia.org"])[0]),
                                domain_allowed: true,
                                browser_workflow: [
                                    { step: 1, action: "open_page", selector: null, description: "Navigate to the target URL" },
                                    { step: 2, action: "extract_text", selector: isGitHub ? "article" : "body", description: "Extract relevant textual content" }
                                ],
                                security_checks: ["domain_allowlist_verified", "new_browser_context", "headless_execution", "html_sanitization", "prompt_injection_filter", "timeout_enforced"],
                                download_path: null,
                                blocked_reason: null,
                                confidence: 0.98
                            })
                        }
                    }]
                };
            }

            if (sys.includes('remote command planner')) {
                const isTelegram = prompt.toLowerCase().includes('telegram');
                const isBlocked = userPart.includes('payment') || userPart.includes('login') || userPart.includes('financial') || userPart.includes('unauthorized');

                if (isBlocked) {
                    return {
                        choices: [{
                            message: {
                                content: JSON.stringify({
                                    request_source: isTelegram ? "telegram" : "dashboard",
                                    intent: "unknown",
                                    required_permission: "none",
                                    policy_required: true,
                                    tool_required: "none",
                                    execution_plan: [],
                                    security_checks: ["user_allowlist_verified", "permission_engine_verified", "policy_validation_passed", "sandbox_execution", "audit_logging_enabled"],
                                    requires_confirmation: false,
                                    blocked_reason: "Action involves restricted operations or unauthorized users.",
                                    confidence: 0.99
                                })
                            }
                        }]
                    };
                }

                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                request_source: isTelegram ? "telegram" : "dashboard",
                                intent: "browse_web",
                                required_permission: "browse_web",
                                policy_required: true,
                                tool_required: "browser_service",
                                execution_plan: [
                                    { step: 1, tool: "browser_service", action: "open_page", target: "https://wikipedia.org/wiki/Redis", description: "Navigate to Redis Wikipedia article" },
                                    { step: 2, tool: "browser_service", action: "extract_text", target: "page_body", description: "Extract visible page text" },
                                    { step: 3, tool: "ai_processor", action: "summarize_text", target: "extracted_content", description: "Generate concise summary of page" }
                                ],
                                security_checks: ["user_allowlist_verified", "permission_engine_verified", "policy_validation_passed", "sandbox_execution", "audit_logging_enabled"],
                                requires_confirmation: false,
                                blocked_reason: null,
                                confidence: 0.95
                            })
                        }
                    }]
                };
            }

            if (sys.includes('security auditor')) {
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                security_controls: [],
                                monitoring_requirements: [],
                                security_alerts: [],
                                confidence: 1.0
                            })
                        }
                    }]
                };
            }

            if (!jsonMode) {
                return { choices: [{ message: { content: "Mock response generated without JSON." } }] };
            }
            return { choices: [{ message: { content: "{ \"status\": \"mock_fallback_success\" }" } }] };
        }

        const response = await axios.post(`${BRAIN_URL}/ai/chat`, {
            prompt,
            systemPrompt,
            userId: effectiveUserId,
            jsonMode
        });

        return response.data;
    } catch (error) {
        logger.error(`AI Service Error: ${error.message}`);
        throw new Error(`AI communication failed: ${error.message}`);
    }
};

module.exports = { getAIResponse };
