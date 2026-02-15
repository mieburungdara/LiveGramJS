/**
 * LiveGramJS - Main Entry Point
 * Live Telegram CRM System
 */

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const config = require('../../config/config.json');

// Initialize database
require('../database/init');

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: config.security.allowedOrigins || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Initialize socket handler
const SocketHandler = require('./socket/handler');
new SocketHandler(io);

// Load automation rules
const automationEngine = require('./automation/engine');
automationEngine.loadAllRules();

// Start server
const PORT = config.server.port || 3000;
const HOST = config.server.host || 'localhost';

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           LiveGramJS - Telegram CRM System                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Server running at: http://${HOST}:${PORT}`);
    console.log(`📡 WebSocket enabled for real-time updates`);
    console.log(`📁 Sessions stored in: ${config.session.path}`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   - GET  /api/health         - Health check');
    console.log('   - POST /api/auth/send-code - Send verification code');
    console.log('   - POST /api/auth/verify    - Verify code & login');
    console.log('   - GET  /api/account/me     - Get profile');
    console.log('   - GET  /api/account/dialogs - Get chats');
    console.log('   - GET  /api/automation/rules - Get automation rules');
    console.log('');
    console.log('💡 Open http://localhost:3000 in your browser to access the dashboard');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, io };
