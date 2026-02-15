/**
 * LiveGramJS - API Client
 */

const API = {
    baseUrl: '/api',
    
    /**
     * Make HTTP request
     */
    async request(method, endpoint, data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(data);
        }
        
        const url = data && method === 'GET' 
            ? `${this.baseUrl}${endpoint}?${new URLSearchParams(data)}`
            : `${this.baseUrl}${endpoint}`;
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Request failed');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Auth endpoints
    auth: {
        sendCode: (phone) => API.request('POST', '/auth/send-code', { phone }),
        verify: (phone, code, phoneCodeHash) => API.request('POST', '/auth/verify', { phone, code, phoneCodeHash }),
        verify2FA: (phone, password) => API.request('POST', '/auth/verify-2fa', { phone, password }),
        logout: (phone) => API.request('POST', '/auth/logout', { phone }),
        status: () => API.request('GET', '/auth/status'),
        sessions: () => API.request('GET', '/auth/sessions'),
        connect: (phone) => API.request('POST', '/auth/connect', { phone }),
        disconnect: (phone) => API.request('POST', '/auth/disconnect', { phone })
    },
    
    // Account endpoints
    account: {
        me: (phone) => API.request('GET', '/account/me', { phone }),
        contacts: (phone) => API.request('GET', '/account/contacts', { phone }),
        dialogs: (phone) => API.request('GET', '/account/dialogs', { phone }),
        groups: (phone) => API.request('GET', '/account/groups', { phone }),
        channels: (phone) => API.request('GET', '/account/channels', { phone }),
        updateProfile: (phone, data) => API.request('PUT', '/account/profile', { phone, ...data })
    },
    
    // Chat endpoints
    chat: {
        messages: (phone, chatId, limit = 50, offsetId = 0) => 
            API.request('GET', '/chat/messages', { phone, chatId, limit, offsetId }),
        send: (phone, chatId, message) => 
            API.request('POST', '/chat/send', { phone, chatId, message }),
        sendDirect: (phone, chatId, message, replyTo) => 
            API.request('POST', '/chat/send-direct', { phone, chatId, message, replyTo }),
        forward: (phone, fromChatId, toChatId, messageIds) => 
            API.request('POST', '/chat/forward', { phone, fromChatId, toChatId, messageIds }),
        delete: (phone, chatId, messageIds) => 
            API.request('DELETE', '/chat/message', { phone, chatId, messageIds }),
        read: (phone, chatId, maxId) => 
            API.request('POST', '/chat/read', { phone, chatId, maxId }),
        search: (phone, query, chatId) => 
            API.request('GET', '/chat/search', { phone, query, chatId }),
        info: (phone, chatId) => 
            API.request('GET', '/chat/info', { phone, chatId })
    },
    
    // Group endpoints
    group: {
        join: (phone, inviteLink) => API.request('POST', '/group/join', { phone, inviteLink }),
        leave: (phone, chatId) => API.request('POST', '/group/leave', { phone, chatId }),
        create: (phone, title, userIds) => API.request('POST', '/group/create', { phone, title, userIds }),
        invite: (phone, chatId, userIds) => API.request('POST', '/group/invite', { phone, chatId, userIds }),
        members: (phone, chatId, limit, offset) => 
            API.request('GET', '/group/members', { phone, chatId, limit, offset }),
        promote: (phone, chatId, userId, title) => 
            API.request('POST', '/group/promote', { phone, chatId, userId, title }),
        search: (phone, query) => API.request('GET', '/group/search', { phone, query })
    },
    
    // Channel endpoints
    channel: {
        create: (phone, title, about, megagroup) => 
            API.request('POST', '/group/channel/create', { phone, title, about, megagroup })
    },
    
    // Automation endpoints
    automation: {
        rules: () => API.request('GET', '/automation/rules'),
        rule: (id) => API.request('GET', `/automation/rules/${id}`),
        create: (name, type, config) => API.request('POST', '/automation/rules', { name, type, config }),
        update: (id, data) => API.request('PUT', `/automation/rules/${id}`, data),
        delete: (id) => API.request('DELETE', `/automation/rules/${id}`),
        toggle: (id) => API.request('POST', `/automation/rules/${id}/toggle`),
        autoReply: (data) => API.request('POST', '/automation/auto-reply', data),
        autoForward: (data) => API.request('POST', '/automation/auto-forward', data),
        autoPost: (data) => API.request('POST', '/automation/auto-post', data),
        logs: (limit) => API.request('GET', '/automation/logs', { limit })
    },
    
    // System endpoints
    system: {
        config: () => API.request('GET', '/system/config'),
        stats: () => API.request('GET', '/system/stats'),
        logs: (limit) => API.request('GET', '/system/logs', { limit }),
        health: () => API.request('GET', '/health')
    }
};

// Export for use
window.API = API;
