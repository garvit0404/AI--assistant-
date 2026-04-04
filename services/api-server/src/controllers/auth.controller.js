const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const SECRET_KEY = process.env.JWT_SECRET || 'ai-assistant-secret-2026';

const register = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        const user = new User({ username, password, role });
        await user.save();

        logger.info(`New user registered: ${username}`);
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        logger.error(`Registration error: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '24h' }
        );

        logger.info(`User login successful: ${username}`);
        res.json({ success: true, token, user: { id: user._id, username: user.username, role: user.role } });
    } catch (err) {
        logger.error(`Login error: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};

const me = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = { register, login, me };
