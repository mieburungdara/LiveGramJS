/**
 * LiveGramJS - Account API Routes
 */

const express = require('express');
const router = express.Router();
const gramjsManager = require('../gramjs/manager');
const db = require('../../database/init');

/**
 * GET /api/account/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const result = await gramjsManager.getMe(phone);

        if (result.success) {
            res.json({
                success: true,
                user: result.user
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/account/contacts
 * Get contacts list
 */
router.get('/contacts', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const contacts = await client.getContacts();
        
        const formattedContacts = contacts.map(c => ({
            id: c.id?.toString(),
            username: c.username,
            firstName: c.firstName,
            lastName: c.lastName,
            phone: c.phone,
            online: c.status?.className === 'UserStatusOnline',
            lastOnline: c.status?.wasOnline
        }));

        res.json({
            success: true,
            contacts: formattedContacts
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/account/dialogs
 * Get all dialogs (chats list)
 */
router.get('/dialogs', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const dialogs = await client.getDialogs();
        
        const formattedDialogs = dialogs.map(d => {
            const entity = d.entity;
            return {
                id: entity.id?.toString(),
                name: entity.title || entity.firstName || entity.username || 'Unknown',
                username: entity.username,
                type: entity.className?.replace('Channel', 'channel')
                    .replace('Chat', 'group')
                    .replace('User', 'private'),
                unreadCount: d.unreadCount,
                unreadMentionsCount: d.unreadMentionsCount,
                archived: d.archived,
                pinned: d.pinned,
                lastMessage: d.message?.message,
                lastMessageDate: d.message?.date
            };
        });

        res.json({
            success: true,
            dialogs: formattedDialogs
        });
    } catch (error) {
        console.error('Get dialogs error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/account/groups
 * Get all groups
 */
router.get('/groups', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const dialogs = await client.getDialogs();
        
        const groups = dialogs
            .filter(d => d.entity?.className === 'Chat' || d.entity?.className === 'Channel')
            .filter(d => !d.entity?.broadcast) // Exclude channels
            .map(d => ({
                id: d.entity.id?.toString(),
                title: d.entity.title,
                username: d.entity.username,
                participantsCount: d.entity.participantsCount,
                unreadCount: d.unreadCount,
                lastMessage: d.message?.message,
                lastMessageDate: d.message?.date
            }));

        res.json({
            success: true,
            groups
        });
    } catch (error) {
        console.error('Get groups error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/account/channels
 * Get all channels
 */
router.get('/channels', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const dialogs = await client.getDialogs();
        
        const channels = dialogs
            .filter(d => d.entity?.className === 'Channel' && d.entity?.broadcast)
            .map(d => ({
                id: d.entity.id?.toString(),
                title: d.entity.title,
                username: d.entity.username,
                participantsCount: d.entity.participantsCount,
                unreadCount: d.unreadCount,
                lastMessage: d.message?.message,
                lastMessageDate: d.message?.date
            }));

        res.json({
            success: true,
            channels
        });
    } catch (error) {
        console.error('Get channels error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/account/avatar
 * Get user avatar
 */
router.get('/avatar', async (req, res) => {
    try {
        const { phone, userId } = req.query;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        const photos = await client.getProfilePhotos(userId || 'me');
        
        if (photos && photos.length > 0) {
            // Get the first photo
            const photo = photos[0];
            res.json({
                success: true,
                avatar: {
                    id: photo.id?.toString(),
                    hasPhoto: true
                }
            });
        } else {
            res.json({
                success: true,
                avatar: {
                    hasPhoto: false
                }
            });
        }
    } catch (error) {
        console.error('Get avatar error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * PUT /api/account/profile
 * Update profile
 */
router.put('/profile', async (req, res) => {
    try {
        const { phone, firstName, lastName, about } = req.body;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            return res.status(400).json({ 
                success: false, 
                error: 'Client not connected' 
            });
        }

        // Update name
        if (firstName || lastName) {
            await client.invoke({
                _: 'account.updateProfile',
                first_name: firstName || '',
                last_name: lastName || ''
            });
        }

        // Update about
        if (about) {
            await client.invoke({
                _: 'account.updateProfile',
                about: about
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
