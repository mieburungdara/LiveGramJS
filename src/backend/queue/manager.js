/**
 * LiveGramJS - Queue Manager
 * Handles task queue with rate limiting and anti-flood
 */

const db = require('../../database/init');
const config = require('../../../config/config.json');

class QueueManager {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.config = config.performance;
        this.lastProcessTime = 0;
        this.requestCount = 0;
        this.windowStart = Date.now();
    }

    /**
     * Add task to queue
     */
    addTask(taskType, taskData, priority = 0) {
        return new Promise((resolve, reject) => {
            const task = {
                type: taskType,
                data: taskData,
                priority,
                resolve,
                reject,
                retries: 0,
                createdAt: Date.now()
            };

            // Insert into database
            try {
                const stmt = db.prepare(`
                    INSERT INTO queue_tasks (task_type, task_data, priority, status, created_at)
                    VALUES (?, ?, ?, 'pending', ?)
                `);
                const result = stmt.run(
                    taskType,
                    JSON.stringify(taskData),
                    priority,
                    new Date().toISOString()
                );
                task.id = result.lastInsertRowid;
            } catch (e) {
                console.error('Error inserting task:', e.message);
            }

            // Add to memory queue (sorted by priority)
            this.queue.push(task);
            this.queue.sort((a, b) => b.priority - a.priority);

            console.log(`📥 Task added: ${taskType} (priority: ${priority})`);

            // Start processing if not already
            if (!this.processing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queue
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            // Check rate limit
            if (!this.checkRateLimit()) {
                await this.delay(1000);
                continue;
            }

            // Apply delay between tasks
            const timeSinceLastProcess = Date.now() - this.lastProcessTime;
            const requiredDelay = this.config.defaultDelay || 1000;
            
            if (timeSinceLastProcess < requiredDelay) {
                await this.delay(requiredDelay - timeSinceLastProcess);
            }

            const task = this.queue.shift();
            await this.executeTask(task);
            this.lastProcessTime = Date.now();
        }

        this.processing = false;
    }

    /**
     * Execute single task
     */
    async executeTask(task) {
        console.log(`⚙️ Processing task: ${task.type}`);

        try {
            // Update status in database
            this.updateTaskStatus(task.id, 'processing');

            // Import handlers dynamically to avoid circular dependencies
            const result = await this.handleTask(task.type, task.data);

            // Success
            this.updateTaskStatus(task.id, 'completed');
            task.resolve(result);
            console.log(`✅ Task completed: ${task.type}`);

        } catch (error) {
            console.error(`❌ Task failed: ${task.type}`, error.message);

            // Retry logic
            if (task.retries < (this.config.maxRetries || 3)) {
                task.retries++;
                console.log(`🔄 Retrying task (${task.retries}/${this.config.maxRetries})`);
                
                // Re-add to queue with lower priority
                task.priority = Math.max(0, task.priority - 1);
                this.queue.unshift(task);
            } else {
                // Max retries reached
                this.updateTaskStatus(task.id, 'failed', error.message);
                task.reject(error);
            }
        }
    }

    /**
     * Handle task by type
     */
    async handleTask(taskType, taskData) {
        const gramjsManager = require('../gramjs/manager');

        switch (taskType) {
            case 'send_message':
                return await this.handleSendMessage(gramjsManager, taskData);
            case 'join_group':
                return await this.handleJoinGroup(gramjsManager, taskData);
            case 'leave_group':
                return await this.handleLeaveGroup(gramjsManager, taskData);
            case 'forward_message':
                return await this.handleForwardMessage(gramjsManager, taskData);
            case 'get_dialogs':
                return await this.handleGetDialogs(gramjsManager, taskData);
            case 'get_messages':
                return await this.handleGetMessages(gramjsManager, taskData);
            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }
    }

    /**
     * Handle send message task
     */
    async handleSendMessage(gramjsManager, data) {
        const { phone, chatId, message } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        return await client.sendMessage(chatId, { message });
    }

    /**
     * Handle join group task
     */
    async handleJoinGroup(gramjsManager, data) {
        const { phone, inviteLink } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        return await client.invoke({
            _: 'messages.importChatInvite',
            hash: this.extractInviteHash(inviteLink)
        });
    }

    /**
     * Handle leave group task
     */
    async handleLeaveGroup(gramjsManager, data) {
        const { phone, chatId } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        return await client.invoke({
            _: 'channels.leaveChannel',
            channel: { _: 'inputChannel', channelId: chatId, accessHash: 0 }
        });
    }

    /**
     * Handle forward message task
     */
    async handleForwardMessage(gramjsManager, data) {
        const { phone, fromChatId, toChatId, messageIds } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        return await client.forwardMessages(toChatId, {
            messages: messageIds,
            fromPeer: fromChatId
        });
    }

    /**
     * Handle get dialogs task
     */
    async handleGetDialogs(gramjsManager, data) {
        const { phone } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        const dialogs = await client.getDialogs();
        return dialogs.map(d => ({
            id: d.id?.toString(),
            name: d.name,
            unreadCount: d.unreadCount,
            archived: d.archived,
            pinned: d.pinned
        }));
    }

    /**
     * Handle get messages task
     */
    async handleGetMessages(gramjsManager, data) {
        const { phone, chatId, limit, offsetId } = data;
        const client = gramjsManager.getClient(phone);
        
        if (!client || !client.connected) {
            throw new Error('Client not connected');
        }

        const messages = await client.getMessages(chatId, {
            limit: limit || 50,
            offsetId: offsetId || 0
        });

        return messages.map(m => ({
            id: m.id?.toString(),
            text: m.message,
            date: m.date,
            fromId: m.fromId?.toString(),
            media: m.media?.className
        }));
    }

    /**
     * Extract invite hash from link
     */
    extractInviteHash(link) {
        const match = link.match(/(?:joinchat\/|\+)([a-zA-Z0-9_-]+)/);
        return match ? match[1] : link;
    }

    /**
     * Check rate limit
     */
    checkRateLimit() {
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxRequests = this.config.rateLimit || 10;

        // Reset window if expired
        if (now - this.windowStart >= windowMs) {
            this.windowStart = now;
            this.requestCount = 0;
        }

        // Check if under limit
        if (this.requestCount < maxRequests) {
            this.requestCount++;
            return true;
        }

        return false;
    }

    /**
     * Update task status in database
     */
    updateTaskStatus(id, status, errorMessage = null) {
        try {
            const stmt = db.prepare(`
                UPDATE queue_tasks 
                SET status = ?, error_message = ?, processed_at = ?
                WHERE id = ?
            `);
            stmt.run(status, errorMessage, new Date().toISOString(), id);
        } catch (e) {
            console.error('Error updating task status:', e.message);
        }
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return {
            pending: this.queue.length,
            processing: this.processing,
            lastProcessTime: this.lastProcessTime,
            requestCount: this.requestCount,
            windowStart: this.windowStart
        };
    }

    /**
     * Clear completed tasks from database
     */
    clearCompletedTasks() {
        try {
            const stmt = db.prepare("DELETE FROM queue_tasks WHERE status = 'completed'");
            stmt.run();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
module.exports = new QueueManager();
