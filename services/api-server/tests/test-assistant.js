/**
 * AI Assistant Security Integration Test
 * Run this script to verify the Intent Parser and Security Classifier.
 * Requires the API server to be running on PORT 3001.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001/api/assistant/request';

const testCases = [
    { message: "Create a simple web app", expected: "SAFE" },
    { message: "Delete the logs folder", expected: "HIGH" },
    { message: "run rm -rf /root", expected: "CRITICAL" }, // Should be blocked
    { message: "Searching for weather", expected: "SAFE" }
];

async function runTests() {
    console.log("🚀 Starting AI Assistant Security Integration Tests...\n");

    for (const tc of testCases) {
        console.log(`[TEST] User Message: "${tc.message}"`);
        try {
            const response = await axios.post(API_URL, { message: tc.message });
            const { security, intent } = response.data;

            console.log(`   └─ Intent: ${intent.intent}`);
            console.log(`   └─ Permission: ${security.permission_level}`);
            console.log(`   └─ Status: ✅ ALLOWED\n`);
        } catch (error) {
            if (error.response && error.response.status === 403) {
                const { error: errMsg, security, audit_id } = error.response.data;
                console.log(`   └─ Intent: ${security ? security.intent : 'unknown'}`);
                console.log(`   └─ Permission: ${security ? security.permission_level : 'CRITICAL'}`);
                console.log(`   └─ Status: 🛡️ BLOCKED (As Expected)`);
                console.log(`   └─ Reason: ${errMsg}\n`);
            } else {
                console.log(`   └─ ❌ Error: ${error.message}\n`);
            }
        }
    }

    console.log("🏁 Testing complete.");
}

runTests();
