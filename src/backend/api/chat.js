/**
 * LiveGramJS - Chat API Routes
 */

const express = require('express');
const router = express.Router();
const gramjsManager = require('../gramjs/manager');
const queueManager = require('../queue/manager');
const db = require('../../database/init');

/**
 * GET /api/chat/messages
 * Get chat messages with pagination
 */
router.get('/messages', async (req, res) => {
    try {
        const { phone, chatId, limit = 50, offsetId = 0 } = req.query;

        if (!phone || !chatId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and chatId are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const messages = await client.getMessages(chatId, {
            limit: parseInt(limit),
            offsetId: parseInt(offsetId)
        });

        const formattedMessages = messages.map(m => ({
            id: m.id?.toString(),
            text: m.message,
            date: m.date,
            fromId: m.fromId?.toString(),
            peerId: m.peerId?.toString(),
            out: m.out,
            media: m.media?.className,
            replyTo: m.replyTo?.replyToMsgId?.toString(),
            forwardFrom: m.fwdFrom?.fromId?.toString(),
            views: m.views,
            forwards: m.forwards
        }));

        res.json({
            success: true,
            messages: formattedMessages,
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/chat/send
 * Send message to chat
 */
router.post('/send', async (req, res) => {
    try {
        const { phone, chatId, message, replyTo } = req.body;

        if (!phone || !chatId || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, chatId, and message are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        // Add to queue for rate limiting
        const result = await queueManager.addTask('send_message', {
            phone,
            chatId,
            message,
            replyTo
        });

        // Log activity
        logActivity(phone, 'send_message', { chatId, messageLength: message.length });

        res.json({
            success: true,
            message: 'Message queued for sending',
            taskId: result.id
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/chat/send-direct
 * Send message directly (bypass queue)
 */
router.post('/send-direct', async (req, res) => {
    try {
        const { phone, chatId, message, replyTo } = req.body;

        if (!phone || !chatId || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, chatId, and message are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const options = { message };
        if (replyTo) {
            options.replyTo = parseInt(replyTo);
        }

        const result = await client.sendMessage(chatId, options);

        res.json({
            success: true,
            message: 'Message sent',
            messageId: result.id?.toString()
        });
    } catch (error) {
        console.error('Send direct error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/chat/forward
 * Forward message(s)
 */
router.post('/forward', async (req, res) => {
    try {
        const { phone, fromChatId, toChatId, messageIds } = req.body;

        if (!phone || !fromChatId || !toChatId || !messageIds) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, fromChatId, toChatId, and messageIds are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const ids = Array.isArray(messageIds) ? messageIds.map(id => parseInt(id)) : [parseInt(messageIds)];

        const result = await client.forwardMessages(toChatId, {
            messages: ids,
            fromPeer: fromChatId
        });

        res.json({
            success: true,
            message: 'Messages forwarded',
            count: ids.length
        });
    } catch (error) {
        console.error('Forward error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * DELETE /api/chat/message
 * Delete message
 */
router.delete('/message', async (req, res) => {
    try {
        const { phone, chatId, messageIds } = req.body;

        if (!phone || !chatId || !messageIds) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, chatId, and messageIds are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const ids = Array.isArray(messageIds) ? messageIds.map(id => parseInt(id)) : [parseInt(messageIds)];

        await client.deleteMessages(chatId, ids);

        res.json({
            success: true,
            message: 'Messages deleted'
        });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/chat/read
 * Mark messages as read
 */
router.post('/read', async (req, res) => {
    try {
        const { phone, chatId, maxId } = req.body;

        if (!phone || !chatId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and chatId are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        await client.invoke({
            _: 'messages.readHistory',
            peer: chatId,
            max_id: maxId || 0
        });

        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Read messages error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/chat/search
 * Search messages
 */
router.get('/search', async (req, res) => {
    try {
        const { phone, chatId, query, limit = 50 } = req.query;

        if (!phone || !query) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and query are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const result = await client.invoke({
            _: 'messages.search',
            peer: chatId || '',
            q: query,
            filter: { _: 'inputMessagesFilterEmpty' },
            min_date: 0,
            max_date: 0,
            offset_id: 0,
            add_offset: 0,
            limit: parseInt(limit),
            max_id: 0,
            min_id: 0,
            hash: 0
        });

        const messages = (result.messages || []).map(m => ({
            id: m.id?.toString(),
            text: m.message,
            date: m.date,
            fromId: m.fromId?.toString(),
            chatId: m.peerId?.toString()
        }));

        res.json({
            success: true,
            messages,
            count: messages.length
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/chat/info
 * Get chat info
 */
router.get('/info', async (req, res) => {
    try {
        const { phone, chatId } = req.query;

        if (!phone || !chatId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and chatId are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const entity = await client.getEntity(chatId);

        res.json({
            success: true,
            chat: {
                id: entity.id?.toString(),
                title: entity.title || entity.firstName,
                username: entity.username,
                type: entity.className,
                participantsCount: entity.participantsCount
            }
        });
    } catch (error) {
        console.error('Get chat info error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Helper: Log activity
 */
function logActivity(phone, action, details) {
    try {
        const stmt = db.prepare(`
            INSERT INTO logs (action, details, status, timestamp)
            VALUES (?, ?, 'success', ?)
        `);
        stmt.run(`${phone}:${action}`, JSON.stringify(details), new Date().toISOString());
    } catch (e) {
        console.error('Log error:', e.message);
    }
}

module.exports = router;
