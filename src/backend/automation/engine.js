/**
 * LiveGramJS - Automation Engine
 * Handles auto-reply, auto-forward, and auto-post automation
 */

const gramjsManager = require('../gramjs/manager');
const db = require('../../database/init');

class AutomationEngine {
    constructor() {
        this.rules = new Map(); // phone -> rules array
        this.loadAllRules();
    }

    /**
     * Load all rules from database
     */
    loadAllRules() {
        try {
            const stmt = db.prepare('SELECT * FROM automation_rules WHERE enabled = 1');
            const rules = stmt.all();
            
            // Group by session
            this.rules.clear();
            for (const rule of rules) {
                const phone = rule.phone || 'default';
                if (!this.rules.has(phone)) {
                    this.rules.set(phone, []);
                }
                this.rules.get(phone).push({
                    id: rule.id,
                    name: rule.name,
                    type: rule.type,
                    config: JSON.parse(rule.config)
                });
            }
            
            console.log(`✅ Loaded ${rules.length} automation rules`);
        } catch (e) {
            console.error('Error loading rules:', e.message);
        }
    }

    /**
     * Reload rules for a specific phone
     */
    reloadRules(phone) {
        this.loadAllRules();
    }

    /**
     * Process incoming message through automation rules
     */
    async processMessage(phone, messageData) {
        const rules = this.rules.get(phone) || [];
        
        for (const rule of rules) {
            try {
                switch (rule.type) {
                    case 'auto_reply':
                        await this.processAutoReply(phone, rule, messageData);
                        break;
                    case 'auto_forward':
                        await this.processAutoForward(phone, rule, messageData);
                        break;
                    case 'auto_post':
                        await this.processAutoPost(phone, rule, messageData);
                        break;
                }
            } catch (e) {
                console.error(`Error processing rule ${rule.id}:`, e.message);
                this.logExecution(rule.id, 'error', e.message);
            }
        }
    }

    /**
     * Process auto-reply rule
     */
    async processAutoReply(phone, rule, messageData) {
        const config = rule.config;
        
        // Check conditions
        if (!this.checkConditions(config.conditions, messageData)) {
            return;
        }

        // Check triggers
        const matched = this.checkTriggers(config.triggers, messageData.text);
        if (!matched) {
            return;
        }

        // Execute action
        const client = gramjsManager.getClient(phone);
        if (!client || !client.connected) {
            return;
        }

        // Apply delay
        const delay = config.delay || 1000;
        await this.delay(delay);

        // Send reply
        const replyMessage = this.formatReply(config.actions[0].message, messageData);
        
        try {
            await client.sendMessage(messageData.chatId, { message: replyMessage });
            this.logExecution(rule.id, 'success', `Replied to ${messageData.chatId}`);
            console.log(`🤖 Auto-reply sent: ${rule.name}`);
        } catch (e) {
            this.logExecution(rule.id, 'error', e.message);
        }
    }

    /**
     * Process auto-forward rule
     */
    async processAutoForward(phone, rule, messageData) {
        const config = rule.config;
        
        // Check conditions
        if (!this.checkConditions(config.conditions, messageData)) {
            return;
        }

        // Check source filter
        if (config.sourceChats && config.sourceChats.length > 0) {
            if (!config.sourceChats.includes(messageData.chatId)) {
                return;
            }
        }

        // Check keyword filter
        if (config.keywords && config.keywords.length > 0) {
            const hasKeyword = config.keywords.some(kw => 
                messageData.text?.toLowerCase().includes(kw.toLowerCase())
            );
            if (!hasKeyword) {
                return;
            }
        }

        const client = gramjsManager.getClient(phone);
        if (!client || !client.connected) {
            return;
        }

        // Apply delay
        const delay = config.delay || 1000;
        await this.delay(delay);

        // Forward to destinations
        for (const destChatId of config.destinationChats || []) {
            try {
                await client.forwardMessages(destChatId, {
                    messages: [parseInt(messageData.messageId)],
                    fromPeer: messageData.chatId
                });
                this.logExecution(rule.id, 'success', `Forwarded to ${destChatId}`);
                console.log(`📤 Auto-forward: ${rule.name} -> ${destChatId}`);
            } catch (e) {
                this.logExecution(rule.id, 'error', `Forward error: ${e.message}`);
            }
        }
    }

    /**
     * Process auto-post rule
     */
    async processAutoPost(phone, rule, messageData) {
        const config = rule.config;
        
        // Check conditions
        if (!this.checkConditions(config.conditions, messageData)) {
            return;
        }

        // Check source
        if (config.sourceChat && config.sourceChat !== messageData.chatId) {
            return;
        }

        const client = gramjsManager.getClient(phone);
        if (!client || !client.connected) {
            return;
        }

        // Apply delay
        const delay = config.delay || 1000;
        await this.delay(delay);

        // Post to channel
        const postMessage = this.formatPost(config.template, messageData);
        
        try {
            await client.sendMessage(config.channelId, { message: postMessage });
            this.logExecution(rule.id, 'success', `Posted to ${config.channelId}`);
            console.log(`📢 Auto-post: ${rule.name}`);
        } catch (e) {
            this.logExecution(rule.id, 'error', e.message);
        }
    }

    /**
     * Check if conditions are met
     */
    checkConditions(conditions, messageData) {
        if (!conditions) return true;

        // Check chat type
        if (conditions.chatType) {
            // Would need to determine chat type from messageData
        }

        // Check time range
        if (conditions.timeRange) {
            const now = new Date();
            const currentHour = now.getHours();
            const { start, end } = conditions.timeRange;
            if (start !== undefined && end !== undefined) {
                if (currentHour < start || currentHour >= end) {
                    return false;
                }
            }
        }

        // Check excluded chats
        if (conditions.excludedChats && conditions.excludedChats.includes(messageData.chatId)) {
            return false;
        }

        return true;
    }

    /**
     * Check if triggers match
     */
    checkTriggers(triggers, text) {
        if (!triggers || triggers.length === 0) return true;
        if (!text) return false;

        for (const trigger of triggers) {
            switch (trigger.type) {
                case 'keyword':
                    if (text.toLowerCase().includes(trigger.value.toLowerCase())) {
                        return true;
                    }
                    break;
                case 'regex':
                    try {
                        const regex = new RegExp(trigger.value, 'i');
                        if (regex.test(text)) {
                            return true;
                        }
                    } catch (e) {
                        console.error('Invalid regex:', trigger.value);
                    }
                    break;
                case 'exact':
                    if (text === trigger.value) {
                        return true;
                    }
                    break;
                case 'startsWith':
                    if (text.startsWith(trigger.value)) {
                        return true;
                    }
                    break;
                case 'endsWith':
                    if (text.endsWith(trigger.value)) {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    /**
     * Format reply message with variables
     */
    formatReply(template, messageData) {
        return template
            .replace('{sender}', messageData.senderId || '')
            .replace('{chat}', messageData.chatId || '')
            .replace('{message}', messageData.text || '')
            .replace('{time}', new Date().toLocaleTimeString())
            .replace('{date}', new Date().toLocaleDateString());
    }

    /**
     * Format post message
     */
    formatPost(template, messageData) {
        return this.formatReply(template, messageData);
    }

    /**
     * Add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log rule execution
     */
    logExecution(ruleId, status, details) {
        try {
            const stmt = db.prepare(`
                INSERT INTO logs (action, details, status, timestamp)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(`automation_rule_${ruleId}`, details, status, new Date().toISOString());
        } catch (e) {
            console.error('Error logging execution:', e.message);
        }
    }

    /**
     * Create new rule
     */
    createRule(phone, name, type, config) {
        try {
            const stmt = db.prepare(`
                INSERT INTO automation_rules (name, type, config, enabled)
                VALUES (?, ?, ?, 1)
            `);
            const result = stmt.run(name, type, JSON.stringify(config));
            this.loadAllRules();
            return { success: true, id: result.lastInsertRowid };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Update rule
     */
    updateRule(id, name, type, config, enabled) {
        try {
            const stmt = db.prepare(`
                UPDATE automation_rules 
                SET name = ?, type = ?, config = ?, enabled = ?, updated_at = ?
                WHERE id = ?
            `);
            stmt.run(name, type, JSON.stringify(config), enabled ? 1 : 0, new Date().toISOString(), id);
            this.loadAllRules();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Delete rule
     */
    deleteRule(id) {
        try {
            const stmt = db.prepare('DELETE FROM automation_rules WHERE id = ?');
            stmt.run(id);
            this.loadAllRules();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Toggle rule enabled status
     */
    toggleRule(id) {
        try {
            const stmt = db.prepare('SELECT enabled FROM automation_rules WHERE id = ?');
            const rule = stmt.get(id);
            
            if (!rule) {
                return { success: false, error: 'Rule not found' };
            }

            const newEnabled = rule.enabled ? 0 : 1;
            const updateStmt = db.prepare('UPDATE automation_rules SET enabled = ? WHERE id = ?');
            updateStmt.run(newEnabled, id);
            this.loadAllRules();
            
            return { success: true, enabled: newEnabled };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Get all rules
     */
    getRules() {
        try {
            const stmt = db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC');
            return stmt.all();
        } catch (e) {
            return [];
        }
    }

    /**
     * Get rule by ID
     */
    getRule(id) {
        try {
            const stmt = db.prepare('SELECT * FROM automation_rules WHERE id = ?');
            return stmt.get(id);
        } catch (e) {
            return null;
        }
    }
}

// Export singleton instance
module.exports = new AutomationEngine();
