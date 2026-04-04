const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger.js');
const { getAIResponse } = require('../services/ai.service.js');
const timelineService = require('../services/timeline.service.js');
const permissionEngine = require('../security/permissionEngine.js');
const { redisClient } = require('../services/redis.service.js');

/**
 * PHASE 6: SECURE EXECUTION LAYER
 * This manager performs actual operations on the filesystem within the sandbox.
 */
class ExecutionManager {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.workspaceDir = path.join(baseDir, 'workspace');

        // Ensure the workspace exists immediately
        if (!fs.existsSync(this.workspaceDir)) {
            fs.mkdirSync(this.workspaceDir, { recursive: true });
            logger.info(`Workspace directory initialized: ${this.workspaceDir}`);
        }
    }

    /**
     * Helper to resolve and validate a path inside the workspace.
     */
    resolvePath(target) {
        if (!target) return null;

        // Remove 'workspace/' prefix if it's there
        const relativeTarget = target.replace(/^workspace\//, '');
        const absolutePath = path.resolve(this.workspaceDir, relativeTarget);

        // Security re-validation: Must be inside workspace
        if (!absolutePath.startsWith(this.workspaceDir)) {
            throw new Error(`CRITICAL_SECURITY_VIOLATION: Attempted access outside workspace: ${target}`);
        }
        return absolutePath;
    }

    /**
     * Tool 1: Filesystem Tool
     */
    async filesystemTool(operation, targetPath, content = '') {
        const absPath = this.resolvePath(targetPath);

        switch (operation) {
            case 'create_directory_if_missing':
            case 'create_directory':
                await fs.ensureDir(absPath);
                return { status: 'success', message: `Directory ensured: ${targetPath}` };

            case 'create_file':
            case 'write_file':
                await fs.outputFile(absPath, content);
                return { status: 'success', message: `File written: ${targetPath}`, content };

            case 'read_file':
                const data = await fs.readFile(absPath, 'utf8');
                return { status: 'success', content: data };

            case 'delete_file':
                await fs.remove(absPath);
                return { status: 'success', message: `File deleted: ${targetPath}` };

            default:
                throw new Error(`Unknown filesystem operation: ${operation}`);
        }
    }

    /**
     * Tool 2: Code Generator Tool
     */
    async codeGeneratorTool(operation, targetPath, intentData) {
        const absPath = this.resolvePath(targetPath);
        logger.info(`Generating code for ${targetPath} using ${operation}`);

        // If in mock mode, provide a 'smarter' template based on keywords
        if (process.env.AI_MODE === 'mock') {
            let mockContent = `// [MOCK MODE] Simulation for: ${targetPath}\n\n`;

            const prompt = (intentData.originalMessage || '').toLowerCase();

            if (prompt.includes('array')) {
                mockContent += `// Real-world Array Example\nconst inventory = ["Apple", "Banana", "Cherry"];\ninventory.forEach((item, index) => {\n    console.log(\`Item \${index + 1}: \${item}\`);\n});\n`;
            } else if (prompt.includes('object')) {
                mockContent += `// Real-world Object Example\nconst user = {\n    name: "Alex",\n    role: "Developer",\n    active: true\n};\nconsole.log(\`User: \${user.name}, Role: \${user.role}\`);\n`;
            } else if (prompt.includes('express') || prompt.includes('server')) {
                mockContent += `const express = require('express');\nconst app = express();\n\napp.get('/', (req, res) => res.send('AI-Generated Secure Server Ready'));\n\napp.listen(3000, () => console.log('Server running on port 3000'));\n`;
            } else {
                mockContent += `// Default Secure Template\nfunction main() {\n    console.log("Hello from a secure AI-generated script!");\n    console.log("Task processed: ${prompt.substring(0, 50)}...");\n}\n\nmain();\n`;
            }

            await fs.outputFile(absPath, mockContent);
            return { status: 'success', message: `Enhanced mock code generated at ${targetPath}`, path: targetPath, content: mockContent };
        }

        // Live Mode: Perform real code generation
        const systemPrompt = "You are a secure code generator. Write only production-ready, security-first code. No conversational text.\nCRITICAL RULE: DO NOT use os.system, subprocess, or make arbitrary network calls. DO NOT write file access code outside of the safe workspace directory.";
        const userPrompt = `Generate a ${intentData.language || 'nodejs'} ${intentData.type || 'script'} for ${targetPath}. 
Follow OWASP security standards. Sanitise inputs. Use secure error handling.`;

        const response = await getAIResponse(userPrompt, systemPrompt, null, false);
        const code = response.choices[0].message.content.trim();

        // Strip markdown if AI included it
        const cleanCode = code.replace(/```[a-z]*\n/g, '').replace(/\n```/g, '');

        await fs.outputFile(absPath, cleanCode);
        return { status: 'success', message: `Live AI code generated at ${targetPath}`, path: targetPath, content: cleanCode };
    }

    /**
     * Tool 3: Task Executor Tool
     */
    async taskExecutorTool(operation, description) {
        // Here we can implement safely scripted tasks (e.g., git status, npm test)
        logger.info(`Task Executor: ${operation} - ${description}`);
        return { status: 'success', result: `Task completed: ${description}` };
    }

    /**
     * Helper to wait for permission approval
     */
    async waitForPermission(requestId) {
        return new Promise((resolve) => {
            const check = async () => {
                const status = await permissionEngine.checkStatus(requestId);
                if (status === 'approved') {
                    resolve(true);
                } else if (status === 'rejected') {
                    resolve(false);
                } else {
                    // Poll Every 2 seconds
                    setTimeout(check, 2000);
                }
            };
            check();
        });
    }

    /**
     * Tool 4: LLM Service Tool
     */
    async llmServiceTool(operation, intentData) {
        logger.info(`LLM Service: ${operation}`);
        const response = await getAIResponse(intentData.originalMessage, "You are a specialized generation agent. Provide only the requested content.", null, false);
        const content = response.choices[0].message.content.trim();
        return { status: 'success', result: content, content: content };
    }

    /**
     * Fallback to raw LLM for Task 2
     */
    async fallbackToLLM(originalMessage) {
        try {
            const response = await getAIResponse(originalMessage, "Execution failed, providing direct AI response as fallback.", null, false);
            return response.choices[0].message.content.trim();
        } catch (e) {
            return "Execution failed and fallback LLM also failed.";
        }
    }

    /**
     * Main Entry: Executes the provided plan step-by-step
     */
    async executePlan(taskId, intentData, executionPlan) {
        logger.info(`Starting execution for task ${taskId} with ${executionPlan.execution_plan ? executionPlan.execution_plan.length : 0} steps.`);
        await timelineService.log(taskId, 'executor', 'Execution started');
        
        const stepsResults = [];
        let currentTool = "unknown";

        try {
            for (const step of executionPlan.execution_plan) {
                currentTool = step.tool;
                logger.info(`Task ${taskId}: Executing step ${step.step} - ${step.tool}.${step.operation}`);
                
                // ... (Permission Gate logic)
                const permRequest = await permissionEngine.requestPermission(
                    taskId, 
                    step.step, 
                    step.tool, 
                    step.operation, 
                    { path: step.path, description: step.description }
                );

                if (permRequest.status === 'pending') {
                    await timelineService.log(taskId, 'executor', `Waiting for permission: ${step.tool}.${step.operation}`);
                    const approved = await this.waitForPermission(permRequest.requestId);
                    if (!approved) {
                        const err = new Error(`Permission denied for step ${step.step}: ${step.tool}.${step.operation}`);
                        err.tool = step.tool;
                        throw err;
                    }
                    await timelineService.log(taskId, 'executor', `Permission granted, resuming execution`);
                }

                await timelineService.log(taskId, 'executor', `Executing ${step.tool}.${step.operation}`, { step: step.step });

                let result;
                let retries = 2;
                while (retries > 0) {
                    try {
                        let executionPromise;
                        switch (step.tool) {
                            case 'filesystem':
                                executionPromise = this.filesystemTool(step.operation, step.path, intentData.content || '');
                                break;
                            case 'code_generator':
                                executionPromise = this.codeGeneratorTool(step.operation, step.path, intentData);
                                break;
                            case 'task_executor':
                                executionPromise = this.taskExecutorTool(step.operation, step.description);
                                break;
                            case 'llm_service':
                                executionPromise = this.llmServiceTool(step.operation, intentData);
                                break;
                            default:
                                executionPromise = Promise.reject(new Error(`Unknown tool: ${step.tool}`));
                        }

                        // Add Timeout Layer
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error(`Execution timeout: ${step.tool} took longer than 15000ms`)), 15000)
                        );

                        result = await Promise.race([executionPromise, timeoutPromise]);
                        break; // Success, exit retry loop
                    } catch (error) {
                        retries--;
                        if (retries === 0) throw error;
                        await timelineService.log(taskId, 'executor', `Step failed: ${error.message}. Retrying... (${retries} attempts left)`);
                        console.log(`[EXECUTOR] Retry triggered for ${step.tool}. Error: ${error.message}`);
                    }
                }

                stepsResults.push({ step: step.step, ...result });
                await timelineService.log(taskId, 'executor', `Step ${step.step} completed`, { result });
            }

            await timelineService.log(taskId, 'executor', 'All tasks completed successfully');
            
            // TASK 1 & 4 FIX: Determine the real output
            const finalOutputResult = stepsResults.find(r => r.content || r.result) || stepsResults[stepsResults.length - 1] || {};
            const output = finalOutputResult.content || finalOutputResult.result || finalOutputResult.message || 'Execution completed';

            console.log("EXECUTOR RESULT:", output); // TASK 6

            return {
                status: 'success',
                message: 'All execution steps completed successfully.',
                output: output, // TASK 1
                results: stepsResults
            };

        } catch (error) {
            logger.error(`Execution halted for task ${taskId}: ${error.message}`);
            await timelineService.log(taskId, 'executor', `Execution failed: ${error.message}`, { error: error.message });
            
            const fallbackOutput = await this.fallbackToLLM(intentData.originalMessage);

            return {
                success: false, // TASK 7
                error: error.message,
                step: "executor",
                tool: currentTool,
                output: fallbackOutput, // TASK 2
                completed_steps: stepsResults
            };
        }
    }
}

// Singleton instance focused on the independent workspace folder at the project root
const projectRoot = path.resolve(__dirname, '../../../../');
const manager = new ExecutionManager(projectRoot);

module.exports = {
    executeIntent: (taskId, intent, plan) => manager.executePlan(taskId, intent, plan)
};
