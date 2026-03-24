/**
 * Global Execution Mode Configuration
 * AI_EXECUTION_MODE: 'mock' | 'live'
 */
const EXECUTION_MODE = process.env.AI_EXECUTION_MODE || "mock";

module.exports = {
  EXECUTION_MODE,
  IS_MOCK: EXECUTION_MODE === "mock",
  IS_LIVE: EXECUTION_MODE === "live"
};
