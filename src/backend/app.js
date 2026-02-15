/**
 * LiveGramJS - Express App Setup
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('../../config/config.json');

// Create Express app
const app = express();

// CORS configuration
app.use(cors({
    origin: config.security.allowedOrigins || ['http://localhost:3000'],
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.security.apiRateLimit || 100,
    message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static files for frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/account', require('./api/account'));
app.use('/api/chat', require('./api/chat'));
app.use('/api/group', require('./api/group'));
app.use('/api/automation', require('./api/automation'));

// System API
app.get('/api/system/config', (req, res) => {
    res.json({
        success: true,
        config: {
            server: config.server,
            performance: config.performance
        }
    });
});

app.get('/api/system/stats', (req, res) => {
    const gramjsManager = require('./gramjs/manager');
    const queueManager = require('./queue/manager');
    
    res.json({
        success: true,
        stats: {
            sessions: gramjsManager.listSessions().length,
            connectedClients: gramjsManager.clients.size,
            queueStatus: queueManager.getQueueStatus()
        }
    });
});

app.get('/api/system/logs', (req, res) => {
    const db = require('../database/init');
    const { limit = 100 } = req.query;
    
    try {
        const stmt = db.prepare(`
            SELECT * FROM logs 
            ORDER BY timestamp DESC 
            LIMIT ?
        `);
        const logs = stmt.all(parseInt(limit));
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

module.exports = app;
