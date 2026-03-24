const mongoose = require('mongoose');
require('dotenv').config({ path: '../../../.env' });

async function seed() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-assistant';
    // Use localhost since we are running this on host
    const localUri = mongoUri.replace('mongodb://mongodb:', 'mongodb://localhost:');

    console.log(`Connecting to: ${localUri}`);
    await mongoose.connect(localUri);

    const db = mongoose.connection.db;

    console.log('Seeding initial data...');
    await db.collection('test_logs').insertOne({
        message: "System initialized",
        timestamp: new Date(),
        level: "info",
        context: "Initial seed"
    });

    await db.collection('user_actions').insertOne({
        action: "create_file",
        user: "developer",
        target: "workspace/hello.js",
        status: "success",
        timestamp: new Date()
    });

    console.log('Seeding complete! Closing connection...');
    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
