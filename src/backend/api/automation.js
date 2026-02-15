/**
 * LiveGramJS - Automation API Routes
 */

const express = require('express');
const router = express.Router();
const automationEngine = require('../automation/engine');

/**
 * GET /api/automation/rules
 * Get all automation rules
 */
router.get('/rules', (req, res) => {
    try {
        const rules = automationEngine.getRules();
        
        res.json({
            success: true,
            rules: rules.map(r => ({
                id: r.id,
                name: r.name,
                type: r.type,
                config: JSON.parse(r.config),
                enabled: r.enabled === 1,
                createdAt: r.created_at,
                updatedAt: r.updated_at
            }))
        });
    } catch (error) {
        console.error('Get rules error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/automation/rules/:id
 * Get single rule by ID
 */
router.get('/rules/:id', (req, res) => {
    try {
        const rule = automationEngine.getRule(parseInt(req.params.id));
        
        if (!rule) {
            return res.status(404).json({ 
                success: false, 
                error: 'Rule not found' 
            });
        }

        res.json({
            success: true,
            rule: {
                id: rule.id,
                name: rule.name,
                type: rule.type,
                config: JSON.parse(rule.config),
                enabled: rule.enabled === 1,
                createdAt: rule.created_at,
                updatedAt: rule.updated_at
            }
        });
    } catch (error) {
        console.error('Get rule error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/automation/rules
 * Create new automation rule
 */
router.post('/rules', (req, res) => {
    try {
        const { name, type, config } = req.body;

        if (!name || !type || !config) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, type, and config are required' 
            });
        }

        // Validate type
        const validTypes = ['auto_reply', 'auto_forward', 'auto_post'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                success: false, 
                error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
            });
        }

        // Validate config structure
        if (!validateConfig(type, config)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid config structure for this type' 
            });
        }

        const result = automationEngine.createRule(null, name, type, config);

        if (result.success) {
            res.json({
                success: true,
                message: 'Rule created successfully',
                id: result.id
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create rule error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * PUT /api/automation/rules/:id
 * Update automation rule
 */
router.put('/rules/:id', (req, res) => {
    try {
        const { name, type, config, enabled } = req.body;
        const id = parseInt(req.params.id);

        // Check if rule exists
        const existing = automationEngine.getRule(id);
        if (!existing) {
            return res.status(404).json({ 
                success: false, 
                error: 'Rule not found' 
            });
        }

        // Validate type if provided
        if (type) {
            const validTypes = ['auto_reply', 'auto_forward', 'auto_post'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ 
                    success: false, 
                    error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
                });
            }
        }

        const result = automationEngine.updateRule(
            id,
            name || existing.name,
            type || existing.type,
            config || JSON.parse(existing.config),
            enabled !== undefined ? enabled : existing.enabled
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Rule updated successfully'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Update rule error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * DELETE /api/automation/rules/:id
 * Delete automation rule
 */
router.delete('/rules/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const result = automationEngine.deleteRule(id);

        if (result.success) {
            res.json({
                success: true,
                message: 'Rule deleted successfully'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Delete rule error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/automation/rules/:id/toggle
 * Toggle rule enabled status
 */
router.post('/rules/:id/toggle', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const result = automationEngine.toggleRule(id);

        if (result.success) {
            res.json({
                success: true,
                message: `Rule ${result.enabled ? 'enabled' : 'disabled'}`,
                enabled: result.enabled
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Toggle rule error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/automation/auto-reply
 * Create auto-reply rule (convenience endpoint)
 */
router.post('/auto-reply', (req, res) => {
    try {
        const { name, triggers, actions, conditions, delay } = req.body;

        if (!name || !triggers || !actions) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, triggers, and actions are required' 
            });
        }

        const config = {
            triggers: Array.isArray(triggers) ? triggers : [triggers],
            actions: Array.isArray(actions) ? actions : [actions],
            conditions: conditions || {},
            delay: delay || 1000
        };

        const result = automationEngine.createRule(null, name, 'auto_reply', config);

        if (result.success) {
            res.json({
                success: true,
                message: 'Auto-reply rule created',
                id: result.id
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create auto-reply error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/automation/auto-forward
 * Create auto-forward rule (convenience endpoint)
 */
router.post('/auto-forward', (req, res) => {
    try {
        const { name, sourceChats, destinationChats, keywords, conditions, delay } = req.body;

        if (!name || !destinationChats) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and destinationChats are required' 
            });
        }

        const config = {
            sourceChats: sourceChats || [],
            destinationChats: Array.isArray(destinationChats) ? destinationChats : [destinationChats],
            keywords: keywords || [],
            conditions: conditions || {},
            delay: delay || 1000
        };

        const result = automationEngine.createRule(null, name, 'auto_forward', config);

        if (result.success) {
            res.json({
                success: true,
                message: 'Auto-forward rule created',
                id: result.id
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create auto-forward error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * POST /api/automation/auto-post
 * Create auto-post rule (convenience endpoint)
 */
router.post('/auto-post', (req, res) => {
    try {
        const { name, sourceChat, channelId, template, conditions, delay } = req.body;

        if (!name || !channelId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name and channelId are required' 
            });
        }

        const config = {
            sourceChat: sourceChat || null,
            channelId,
            template: template || '{message}',
            conditions: conditions || {},
            delay: delay || 1000
        };

        const result = automationEngine.createRule(null, name, 'auto_post', config);

        if (result.success) {
            res.json({
                success: true,
                message: 'Auto-post rule created',
                id: result.id
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Create auto-post error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * GET /api/automation/logs
 * Get automation execution logs
 */
router.get('/logs', (req, res) => {
    try {
        const db = require('../../database/init');
        const { limit = 100, action } = req.query;

        let stmt;
        if (action) {
            stmt = db.prepare(`
                SELECT * FROM logs 
                WHERE action LIKE ?
                ORDER BY timestamp DESC 
                LIMIT ?
            `);
            const logs = stmt.all(`automation_rule_%`, parseInt(limit));
            res.json({ success: true, logs });
        } else {
            stmt = db.prepare(`
                SELECT * FROM logs 
                WHERE action LIKE 'automation_rule_%'
                ORDER BY timestamp DESC 
                LIMIT ?
            `);
            const logs = stmt.all(parseInt(limit));
            res.json({ success: true, logs });
        }
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * Helper: Validate config structure
 */
function validateConfig(type, config) {
    switch (type) {
        case 'auto_reply':
            return config.triggers && config.actions;
        case 'auto_forward':
            return config.destinationChats;
        case 'auto_post':
            return config.channelId;
        default:
            return false;
    }
}

module.exports = router;
