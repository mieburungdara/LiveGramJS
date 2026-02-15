/**
 * LiveGramJS - Socket.IO Handler
 * Handles real-time communication with frontend
 */

const gramjsManager = require('../gramjs/manager');
const eventManager = require('../gramjs/events');
const queueManager = require('../queue/manager');

class SocketHandler {
    constructor(io) {
        this.io = io;
        this.clients = new Map(); // socketId -> phone
        this.setupHandlers();
        eventManager.setSocketIO(io);
    }

    setupHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Send initial status
            socket.emit('connection_status', {
                status: 'connected',
                timestamp: new Date().toISOString()
            });

            // Subscribe to account updates
            socket.on('subscribe', (data) => {
                const { phone } = data;
                if (phone) {
                    this.clients.set(socket.id, phone);
                    socket.join(`account:${phone}`);
                    console.log(`📱 Client subscribed to: ${phone}`);
                    
                    // Send current status
                    const isConnected = gramjsManager.isConnected(phone);
                    socket.emit('account_status', {
                        phone,
                        connected: isConnected
                    });
                }
            });

            // Unsubscribe
            socket.on('unsubscribe', (data) => {
                const { phone } = data;
                if (phone) {
                    this.clients.delete(socket.id);
                    socket.leave(`account:${phone}`);
                }
            });

            // Send message
            socket.on('send_message', async (data) => {
                try {
                    const { phone, chatId, message } = data;
                    const result = await queueManager.addTask('send_message', {
                        phone,
                        chatId,
                        message
                    });
                    socket.emit('message_sent', { success: true, ...data });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Join group
            socket.on('join_group', async (data) => {
                try {
                    const { phone, inviteLink } = data;
                    const result = await queueManager.addTask('join_group', {
                        phone,
                        inviteLink
                    });
                    socket.emit('group_joined', { success: true, inviteLink });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Leave group
            socket.on('leave_group', async (data) => {
                try {
                    const { phone, chatId } = data;
                    const result = await queueManager.addTask('leave_group', {
                        phone,
                        chatId
                    });
                    socket.emit('group_left', { success: true, chatId });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Get queue status
            socket.on('get_queue_status', () => {
                const status = queueManager.getQueueStatus();
                socket.emit('queue_status', status);
            });

            // Get sessions
            socket.on('get_sessions', () => {
                const sessions = gramjsManager.listSessions();
                socket.emit('sessions_list', sessions);
            });

            // Disconnect
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.clients.delete(socket.id);
            });

            // Error handling
            socket.on('error', (error) => {
                console.error(`Socket error: ${error}`);
            });
        });
    }

    /**
     * Broadcast to specific account
     */
    broadcastToAccount(phone, event, data) {
        this.io.to(`account:${phone}`).emit(event, data);
    }

    /**
     * Broadcast to all clients
     */
    broadcastAll(event, data) {
        this.io.emit(event, data);
    }

    /**
     * Get connected clients count
     */
    getConnectedCount() {
        return this.io.sockets.sockets.size;
    }
}

module.exports = SocketHandler;
