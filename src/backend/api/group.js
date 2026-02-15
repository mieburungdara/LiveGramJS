/**
 * LiveGramJS - Group & Channel API Routes
 */

const express = require('express');
const router = express.Router();
const gramjsManager = require('../gramjs/manager');
const queueManager = require('../queue/manager');
const db = require('../../database/init');

/**
 * POST /api/group/join
 * Join group via invite link or username
 */
router.post('/join', async (req, res) => {
    try {
        const { phone, inviteLink } = req.body;

        if (!phone || !inviteLink) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and inviteLink are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        // Check if it's a username or invite link
        if (inviteLink.startsWith('@') || inviteLink.startsWith('https://t.me/')) {
            // Join by username
            let username = inviteLink.replace('@', '').replace('https://t.me/', '');
            
            const result = await client.invoke({
                _: 'channels.joinChannel',
                channel: { 
                    _: 'inputChannel', 
                    channelId: 0, 
                    accessHash: 0,
                    username: username
                }
            });

            res.json({
                success: true,
                message: 'Joined successfully'
            });
        } else {
            // Join via invite hash
            const hash = extractInviteHash(inviteLink);
            
            const result = await client.invoke({
                _: 'messages.importChatInvite',
                hash: hash
            });

            res.json({
                success: true,
                message: 'Joined successfully'
            });
        }

        // Log activity
        logActivity(phone, 'join_group', { inviteLink });

    } catch (error) {
        console.error('Join group error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/group/leave
 * Leave group or channel
 */
router.post('/leave', async (req, res) => {
    try {
        const { phone, chatId } = req.body;

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

        // Get entity to determine type
        const entity = await client.getEntity(chatId);

        if (entity.className === 'Channel') {
            await client.invoke({
                _: 'channels.leaveChannel',
                channel: { 
                    _: 'inputChannel', 
                    channelId: parseInt(entity.id), 
                    accessHash: entity.accessHash?.toJSNumber?.() || 0
                }
            });
        } else {
            await client.invoke({
                _: 'messages.deleteChatUser',
                chat_id: parseInt(entity.id),
                user_id: { _: 'inputUserSelf' }
            });
        }

        res.json({
            success: true,
            message: 'Left successfully'
        });

        logActivity(phone, 'leave_group', { chatId });

    } catch (error) {
        console.error('Leave group error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/group/create
 * Create new group
 */
router.post('/create', async (req, res) => {
    try {
        const { phone, title, userIds = [] } = req.body;

        if (!phone || !title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and title are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        // Create group
        const result = await client.invoke({
            _: 'messages.createChat',
            title: title,
            users: userIds.map(id => ({ 
                _: 'inputUser', 
                userId: parseInt(id), 
                accessHash: 0n 
            }))
        });

        res.json({
            success: true,
            message: 'Group created successfully',
            chatId: result.chats?.[0]?.id?.toString()
        });

        logActivity(phone, 'create_group', { title, userIds });

    } catch (error) {
        console.error('Create group error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/channel/create
 * Create new channel
 */
router.post('/channel/create', async (req, res) => {
    try {
        const { phone, title, about = '', megagroup = false } = req.body;

        if (!phone || !title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and title are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        // Create channel
        const result = await client.invoke({
            _: 'channels.createChannel',
            title: title,
            about: about,
            megagroup: megagroup
        });

        res.json({
            success: true,
            message: 'Channel created successfully',
            channelId: result.chats?.[0]?.id?.toString()
        });

        logActivity(phone, 'create_channel', { title });

    } catch (error) {
        console.error('Create channel error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/group/invite
 * Invite user to group
 */
router.post('/invite', async (req, res) => {
    try {
        const { phone, chatId, userIds } = req.body;

        if (!phone || !chatId || !userIds) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, chatId, and userIds are required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const ids = Array.isArray(userIds) ? userIds : [userIds];

        const result = await client.invoke({
            _: 'messages.addChatUser',
            chat_id: parseInt(chatId),
            users: ids.map(id => ({ 
                _: 'inputUser', 
                userId: parseInt(id), 
                accessHash: 0n 
            }))
        });

        res.json({
            success: true,
            message: 'Users invited successfully'
        });

        logActivity(phone, 'invite_users', { chatId, userIds: ids });

    } catch (error) {
        console.error('Invite users error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/group/members
 * Get group members
 */
router.get('/members', async (req, res) => {
    try {
        const { phone, chatId, limit = 100, offset = 0 } = req.query;

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

        const result = await client.invoke({
            _: 'channels.getParticipants',
            channel: { 
                _: 'inputChannel', 
                channelId: parseInt(chatId), 
                accessHash: 0n 
            },
            filter: { _: 'channelParticipantsRecent' },
            offset: parseInt(offset),
            limit: parseInt(limit)
        });

        const members = (result.users || []).map(u => ({
            id: u.id?.toString(),
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            online: u.status?.className === 'UserStatusOnline'
        }));

        res.json({
            success: true,
            members,
            count: members.length,
            total: result.count
        });

    } catch (error) {
        console.error('Get members error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/group/promote
 * Promote user to admin
 */
router.post('/promote', async (req, res) => {
    try {
        const { phone, chatId, userId, title = 'Admin' } = req.body;

        if (!phone || !chatId || !userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone, chatId, and userId are required' 
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
            _: 'channels.editAdmin',
            channel: { 
                _: 'inputChannel', 
                channelId: parseInt(chatId), 
                accessHash: 0n 
            },
            user_id: { 
                _: 'inputUser', 
                userId: parseInt(userId), 
                accessHash: 0n 
            },
            admin_rights: {
                _: 'chatAdminRights',
                change_info: true,
                post_messages: true,
                edit_messages: true,
                delete_messages: true,
                ban_users: true,
                invite_users: true,
                pin_messages: true,
                add_admins: false
            },
            rank: title
        });

        res.json({
            success: true,
            message: 'User promoted to admin'
        });

        logActivity(phone, 'promote_admin', { chatId, userId });

    } catch (error) {
        console.error('Promote error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/group/search
 * Search public groups
 */
router.get('/search', async (req, res) => {
    try {
        const { phone, query, limit = 20 } = req.query;

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
            _: 'channels.searchPosts',
            hashtag: query,
            offset_rate: 0,
            offset_peer: { _: 'inputPeerEmpty' },
            offset_id: 0,
            limit: parseInt(limit)
        });

        const groups = (result.chats || []).map(c => ({
            id: c.id?.toString(),
            title: c.title,
            username: c.username,
            participantsCount: c.participantsCount
        }));

        res.json({
            success: true,
            groups
        });

    } catch (error) {
        console.error('Search groups error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Helper: Extract invite hash from link
 */
function extractInviteHash(link) {
    const match = link.match(/(?:joinchat\/|\+)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : link;
}

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
