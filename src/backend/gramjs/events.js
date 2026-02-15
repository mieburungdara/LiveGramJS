/**
 * LiveGramJS - GramJS Event Handlers
 * Handles real-time events from Telegram
 */

const gramjsManager = require('./manager');

class EventManager {
    constructor() {
        this.handlers = new Map(); // phone -> event handlers
        this.socketIO = null;
    }

    /**
     * Set Socket.IO instance
     */
    setSocketIO(io) {
        this.socketIO = io;
    }

    /**
     * Register event handlers for a client
     */
    registerHandlers(phone) {
        const client = gramjsManager.getClient(phone);
        if (!client) return;

        // Prevent duplicate handlers
        if (this.handlers.has(phone)) {
            return;
        }

        // New message handler
        client.addEventHandler((update) => {
            this.handleNewMessage(phone, update);
        }, { func: (update) => update.className === 'UpdateNewMessage' || update.className === 'UpdateNewChannelMessage' });

        // Message edit handler
        client.addEventHandler((update) => {
            this.handleEditMessage(phone, update);
        }, { func: (update) => update.className === 'UpdateEditMessage' || update.className === 'UpdateEditChannelMessage' });

        // Delete message handler
        client.addEventHandler((update) => {
            this.handleDeleteMessage(phone, update);
        }, { func: (update) => update.className === 'UpdateDeleteMessages' || update.className === 'UpdateDeleteChannelMessages' });

        // User status handler
        client.addEventHandler((update) => {
            this.handleUserStatus(phone, update);
        }, { func: (update) => update.className === 'UpdateUserStatus' });

        // Chat action handler (typing, etc)
        client.addEventHandler((update) => {
            this.handleChatAction(phone, update);
        }, { func: (update) => update.className === 'UpdateChatUserPost' || update.className === 'UpdateUserTyping' });

        this.handlers.set(phone, true);
        console.log(`✅ Event handlers registered for ${phone}`);
    }

    /**
     * Handle new message
     */
    async handleNewMessage(phone, update) {
        try {
            const message = update.message;
            if (!message) return;

            const messageData = {
                type: 'new_message',
                phone,
                chatId: message.peerId?.toString(),
                messageId: message.id?.toString(),
                senderId: message.fromId?.toString(),
                text: message.message || '',
                date: message.date,
                media: this.extractMediaInfo(message.media),
                timestamp: new Date().toISOString()
            };

            // Broadcast to connected clients
            this.broadcast('message', messageData);

            // Process automation rules
            const automationEngine = require('../automation/engine');
            await automationEngine.processMessage(phone, messageData);

        } catch (e) {
            console.error('Error handling new message:', e.message);
        }
    }

    /**
     * Handle edit message
     */
    handleEditMessage(phone, update) {
        try {
            const message = update.message;
            if (!message) return;

            const messageData = {
                type: 'edit_message',
                phone,
                chatId: message.peerId?.toString(),
                messageId: message.id?.toString(),
                text: message.message || '',
                timestamp: new Date().toISOString()
            };

            this.broadcast('message_edit', messageData);
        } catch (e) {
            console.error('Error handling edit message:', e.message);
        }
    }

    /**
     * Handle delete message
     */
    handleDeleteMessage(phone, update) {
        try {
            const data = {
                type: 'delete_message',
                phone,
                chatId: update.peer?.toString(),
                messageIds: update.messages,
                timestamp: new Date().toISOString()
            };

            this.broadcast('message_delete', data);
        } catch (e) {
            console.error('Error handling delete message:', e.message);
        }
    }

    /**
     * Handle user status
     */
    handleUserStatus(phone, update) {
        try {
            const data = {
                type: 'user_status',
                phone,
                userId: update.userId?.toString(),
                status: update.status?.className,
                wasOnline: update.status?.wasOnline,
                timestamp: new Date().toISOString()
            };

            this.broadcast('user_status', data);
        } catch (e) {
            console.error('Error handling user status:', e.message);
        }
    }

    /**
     * Handle chat action (typing, etc)
     */
    handleChatAction(phone, update) {
        try {
            const data = {
                type: 'chat_action',
                phone,
                chatId: update.peerId?.toString(),
                userId: update.userId?.toString(),
                action: update.action?.className,
                timestamp: new Date().toISOString()
            };

            this.broadcast('chat_action', data);
        } catch (e) {
            console.error('Error handling chat action:', e.message);
        }
    }

    /**
     * Extract media info from message
     */
    extractMediaInfo(media) {
        if (!media) return null;

        const mediaType = media.className;
        const info = { type: mediaType };

        switch (mediaType) {
            case 'MessageMediaPhoto':
                info.photoId = media.photo?.id?.toString();
                break;
            case 'MessageMediaDocument':
                info.documentId = media.document?.id?.toString();
                info.mimeType = media.document?.mimeType;
                info.fileName = media.document?.attributes?.find(a => a.fileName)?.fileName;
                break;
            case 'MessageMediaGeo':
                info.geo = media.geo;
                break;
            case 'MessageMediaContact':
                info.contact = {
                    phone: media.phoneNumber,
                    firstName: media.firstName,
                    lastName: media.lastName
                };
                break;
        }

        return info;
    }

    /**
     * Broadcast event to all connected socket clients
     */
    broadcast(event, data) {
        if (this.socketIO) {
            this.socketIO.emit(event, data);
        }
    }

    /**
     * Unregister handlers for a client
     */
    unregisterHandlers(phone) {
        this.handlers.delete(phone);
        console.log(`🔌 Event handlers unregistered for ${phone}`);
    }
}

// Export singleton instance
module.exports = new EventManager();
