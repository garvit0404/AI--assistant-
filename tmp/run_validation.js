const axios = require('axios');

async function runTests() {
    const tests = [
        { name: "TEST 1 — VALID SYSTEM COMMAND", body: { message: "list docker containers", userId: "test-user" } },
        { name: "TEST 2 — NATURAL LANGUAGE VARIANT", body: { message: "show running containers", userId: "test-user" } },
        { name: "TEST 3 — GENERAL CHAT", body: { message: "hello", userId: "test-user" } },
        { name: "TEST 4 — DANGEROUS DELETE", body: { message: "delete all files", userId: "test-user" } },
        { name: "TEST 5 — PATH TRAVERSAL ATTACK", body: { message: "../../etc/passwd", userId: "test-user" } },
        { name: "TEST 6 — SAFE FILE WRITE (VALID)", body: { message: "create file /workspace/test.txt", userId: "test-user" } },
        { name: "TEST 7 — OUTSIDE WORKSPACE", body: { message: "create file /etc/test.txt", userId: "test-user" } }
    ];

    for (const [index, test] of tests.entries()) {
        console.log(`--- ${test.name} ---`);
        try {
            const response = await axios.post('http://localhost:3001/api/assistant/request', test.body);
            console.log(JSON.stringify(response.data, null, 2));
        } catch (err) {
            if (err.response) {
                console.log(`Error Status: ${err.response.status}`);
                console.log(JSON.stringify(err.response.data, null, 2));
            } else {
                console.error(`Error: ${err.message}`);
            }
        }
        console.log("\n");
    }
}

runTests();
