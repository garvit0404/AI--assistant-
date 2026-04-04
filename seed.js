const mongoose = require('mongoose');
const User = require('./services/api-server/src/models/User');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URL = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_assistant';

async function seed() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('Connected to MongoDB');

        const existing = await User.findOne({ username: 'admin' });
        if (existing) {
            console.log('Admin user already exists');
        } else {
            const admin = new User({
                username: 'admin',
                password: 'adminpassword123', // In a real scenario, this would be more secure
                role: 'admin'
            });
            await admin.save();
            console.log('Admin user created: admin / adminpassword123');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seed();
