/**
 * LiveGramJS - Authentication API Routes
 */

const express = require('express');
const router = express.Router();
const gramjsManager = require('../gramjs/manager');
const eventManager = require('../gramjs/events');
const db = require('../../database/init');

/**
 * POST /api/auth/send-code
 * Send verification code to phone number
 */
router.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        // Validate phone format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid phone number format. Use international format (e.g., +62812345678)' 
            });
        }

        const result = await gramjsManager.sendCode(phone);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Verification code sent to your Telegram app',
                phoneCodeHash: result.phoneCodeHash
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Send code error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify code and sign in
 */
router.post('/verify', async (req, res) => {
    try {
        const { phone, code, phoneCodeHash } = req.body;

        if (!phone || !code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and code are required' 
            });
        }

        const result = await gramjsManager.verifyCode(phone, code, phoneCodeHash);

        if (result.success) {
            // Register event handlers
            eventManager.registerHandlers(phone);

            // Update database
            try {
                const stmt = db.prepare(`
                    INSERT OR REPLACE INTO sessions (phone, session_data, user_id, username, first_name, last_name, last_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run(
                    phone,
                    'session_saved_in_file',
                    result.user?.id,
                    result.user?.username,
                    result.user?.firstName,
                    result.user?.lastName,
                    new Date().toISOString()
                );
            } catch (dbError) {
                console.error('Database error:', dbError);
            }

            res.json({
                success: true,
                message: 'Login successful',
                user: result.user
            });
        } else if (result.requires2FA) {
            res.json({
                success: false,
                requires2FA: true,
                message: 'Two-factor authentication required'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/auth/verify-2fa
 * Verify 2FA password
 */
router.post('/verify-2fa', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone and password are required' 
            });
        }

        const result = await gramjsManager.signIn2FA(phone, password);

        if (result.success) {
            eventManager.registerHandlers(phone);
            res.json({
                success: true,
                message: 'Login successful',
                user: result.user
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('2FA verify error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/auth/logout
 * Logout and delete session
 */
router.post('/logout', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        // Unregister event handlers
        eventManager.unregisterHandlers(phone);

        // Logout from Telegram
        const result = await gramjsManager.logout(phone);

        // Delete from database
        try {
            const stmt = db.prepare('DELETE FROM sessions WHERE phone = ?');
            stmt.run(phone);
        } catch (dbError) {
            console.error('Database error:', dbError);
        }

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', (req, res) => {
    try {
        const sessions = gramjsManager.listSessions();
        
        res.json({
            success: true,
            sessions: sessions.map(s => ({
                phone: s.phone,
                username: s.username,
                firstName: s.firstName,
                lastName: s.lastName,
                connected: gramjsManager.isConnected(s.phone),
                savedAt: s.savedAt
            }))
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/auth/sessions
 * List all saved sessions
 */
router.get('/sessions', (req, res) => {
    try {
        const sessions = gramjsManager.listSessions();
        
        res.json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/auth/connect
 * Connect using saved session
 */
router.post('/connect', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        // Check if session exists
        if (!gramjsManager.hasSession(phone)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session not found. Please login first.' 
            });
        }

        // Connect client
        const result = await gramjsManager.connectClient(phone);

        if (result.success) {
            // Register event handlers
            eventManager.registerHandlers(phone);

            // Get user info
            const me = await gramjsManager.getMe(phone);

            res.json({
                success: true,
                message: 'Connected successfully',
                user: me.user
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Connect error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/auth/disconnect
 * Disconnect client (keep session)
 */
router.post('/disconnect', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number is required' 
            });
        }

        // Unregister event handlers
        eventManager.unregisterHandlers(phone);

        // Disconnect client
        const result = await gramjsManager.disconnectClient(phone);

        res.json({
            success: true,
            message: 'Disconnected successfully'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

module.exports = router;
