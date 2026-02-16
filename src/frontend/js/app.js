/**
 * LiveGramJS - Main Application
 */

class LiveGramApp {
    constructor() {
        this.currentPhone = null;
        this.currentChatId = null;
        this.phoneCodeHash = null;
        this.theme = localStorage.getItem('theme') || 'light';
        
        this.init();
    }
    
    /**
     * Initialize application
     */
    async init() {
        // Apply theme
        this.applyTheme();
        
        // Initialize socket
        SocketClient.init();
        
        // Setup socket handlers
        this.setupSocketHandlers();
        
        // Setup UI event listeners
        this.setupEventListeners();
        
        // Check for saved sessions
        await this.checkSessions();
        
        // Hide loading screen and show login
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    }
    
    /**
     * Setup socket event handlers
     */
    setupSocketHandlers() {
        SocketClient.on('onConnectionStatus', (data) => {
            this.updateConnectionStatus(data.connected);
        });
        
        SocketClient.on('onAccountStatus', (data) => {
            this.updateConnectionStatus(data.connected);
        });
        
        SocketClient.on('onNewMessage', (data) => {
            this.handleNewMessage(data);
        });
        
        SocketClient.on('onQueueStatus', (data) => {
            this.updateQueueStatus(data);
        });
        
        SocketClient.on('onError', (data) => {
            this.showToast(data.message, 'error');
        });
    }
    
    /**
     * Setup UI event listeners
     */
    setupEventListeners() {
        // Login flow
        document.getElementById('send-code-btn').addEventListener('click', () => this.sendCode());
        document.getElementById('verify-btn').addEventListener('click', () => this.verifyCode());
        document.getElementById('back-phone-btn').addEventListener('click', () => this.showStep('phone'));
        document.getElementById('verify-2fa-btn').addEventListener('click', () => this.verify2FA());
        
        // Enter key handlers
        document.getElementById('phone-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendCode();
        });
        document.getElementById('code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verifyCode();
        });
        document.getElementById('password-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.verify2FA();
        });
        
        // Header
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.getElementById('account-select').addEventListener('change', (e) => this.switchAccount(e.target.value));
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(item.dataset.view);
            });
        });
        
        // Chats
        document.getElementById('chat-search').addEventListener('input', (e) => this.searchChats(e.target.value));
        
        // Groups
        document.getElementById('join-group-btn').addEventListener('click', () => this.joinGroup());
        
        // Automation
        document.getElementById('create-rule-btn').addEventListener('click', () => this.showCreateRuleModal());
        
        // Logs
        document.getElementById('refresh-logs-btn').addEventListener('click', () => this.loadLogs());
        
        // Chat detail
        document.getElementById('back-to-chats').addEventListener('click', () => this.switchView('chats'));
        document.getElementById('send-message-btn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
        
        // Modal
        document.getElementById('modal-close').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideModal());
    }
    
    /**
     * Check for saved sessions
     */
    async checkSessions() {
        try {
            const result = await API.auth.sessions();
            
            if (result.success && result.sessions.length > 0) {
                this.showSavedSessions(result.sessions);
            }
        } catch (error) {
            console.error('Error checking sessions:', error);
        }
    }
    
    /**
     * Show saved sessions
     */
    showSavedSessions(sessions) {
        const container = document.getElementById('sessions-list');
        container.innerHTML = '';
        
        sessions.forEach(session => {
            const div = document.createElement('div');
            div.className = 'session-item';
            div.innerHTML = `
                <div class="session-info">
                    <div class="session-avatar">${(session.firstName || session.phone || '?')[0].toUpperCase()}</div>
                    <div>
                        <div class="session-name">${session.firstName || session.phone}</div>
                        <div class="session-phone">${session.phone}</div>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary" onclick="app.connectSession('${session.phone}')">Connect</button>
            `;
            container.appendChild(div);
        });
        
        document.getElementById('saved-sessions').classList.remove('hidden');
    }
    
    /**
     * Connect to saved session
     */
    async connectSession(phone) {
        try {
            this.showLoading();
            const result = await API.auth.connect(phone);
            
            if (result.success) {
                this.currentPhone = phone;
                this.showDashboard();
                this.loadAccountData();
                SocketClient.subscribe(phone);
                this.showToast('Connected successfully!', 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Send verification code
     */
    async sendCode() {
        const phone = document.getElementById('phone-input').value.trim();
        
        if (!phone) {
            this.showToast('Please enter phone number', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const result = await API.auth.sendCode(phone);
            
            if (result.success) {
                this.phoneCodeHash = result.phoneCodeHash;
                this.currentPhone = phone;
                this.showStep('code');
                this.showToast('Verification code sent!', 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Verify code
     */
    async verifyCode() {
        const code = document.getElementById('code-input').value.trim();
        
        if (!code) {
            this.showToast('Please enter verification code', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const result = await API.auth.verify(this.currentPhone, code, this.phoneCodeHash);
            
            if (result.success) {
                this.showDashboard();
                this.loadAccountData();
                SocketClient.subscribe(this.currentPhone);
                this.showToast('Login successful!', 'success');
            } else if (result.requires2FA) {
                this.showStep('2fa');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Verify 2FA password
     */
    async verify2FA() {
        const password = document.getElementById('password-input').value;
        
        if (!password) {
            this.showToast('Please enter password', 'error');
            return;
        }
        
        try {
            this.showLoading();
            const result = await API.auth.verify2FA(this.currentPhone, password);
            
            if (result.success) {
                this.showDashboard();
                this.loadAccountData();
                SocketClient.subscribe(this.currentPhone);
                this.showToast('Login successful!', 'success');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Logout
     */
    async logout() {
        if (!this.currentPhone) return;
        
        try {
            await API.auth.logout(this.currentPhone);
            SocketClient.unsubscribe(this.currentPhone);
            this.currentPhone = null;
            this.showLogin();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Switch account
     */
    async switchAccount(phone) {
        if (!phone) return;
        
        try {
            const result = await API.auth.connect(phone);
            
            if (result.success) {
                this.currentPhone = phone;
                this.loadAccountData();
                SocketClient.subscribe(phone);
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Load account data
     */
    async loadAccountData() {
        await Promise.all([
            this.loadChats(),
            this.loadGroups(),
            this.loadChannels(),
            this.loadContacts(),
            this.loadAutomationRules()
        ]);
    }
    
    /**
     * Load chats
     */
    async loadChats() {
        try {
            const result = await API.account.dialogs(this.currentPhone);
            
            if (result.success) {
                this.renderChats(result.dialogs);
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }
    
    /**
     * Render chats list
     */
    renderChats(chats) {
        const container = document.getElementById('chats-list');
        container.innerHTML = '';
        
        if (chats.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">💬</div><p>No chats found</p></div>';
            return;
        }
        
        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = 'chat-item';
            div.onclick = () => this.openChat(chat.id);
            div.innerHTML = `
                <div class="item-avatar">${(chat.name || '?')[0].toUpperCase()}</div>
                <div class="item-info">
                    <div class="item-name">${chat.name || 'Unknown'}</div>
                    <div class="item-preview">${chat.lastMessage || ''}</div>
                </div>
                <div class="item-meta">
                    <div class="item-time">${this.formatTime(chat.lastMessageDate)}</div>
                    ${chat.unreadCount > 0 ? `<div class="item-badge">${chat.unreadCount}</div>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Load groups
     */
    async loadGroups() {
        try {
            const result = await API.account.groups(this.currentPhone);
            
            if (result.success) {
                this.renderGroups(result.groups);
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        }
    }
    
    /**
     * Render groups list
     */
    renderGroups(groups) {
        const container = document.getElementById('groups-list');
        container.innerHTML = '';
        
        if (groups.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>No groups found</p></div>';
            return;
        }
        
        groups.forEach(group => {
            const div = document.createElement('div');
            div.className = 'group-item';
            div.innerHTML = `
                <div class="item-avatar">${(group.title || '?')[0].toUpperCase()}</div>
                <div class="item-info">
                    <div class="item-name">${group.title}</div>
                    <div class="item-preview">${group.participantsCount || 0} members</div>
                </div>
                <button class="btn btn-sm btn-danger" onclick="app.leaveGroup('${group.id}')">Leave</button>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Load channels
     */
    async loadChannels() {
        try {
            const result = await API.account.channels(this.currentPhone);
            
            if (result.success) {
                this.renderChannels(result.channels);
            }
        } catch (error) {
            console.error('Error loading channels:', error);
        }
    }
    
    /**
     * Render channels list
     */
    renderChannels(channels) {
        const container = document.getElementById('channels-list');
        container.innerHTML = '';
        
        if (channels.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📢</div><p>No channels found</p></div>';
            return;
        }
        
        channels.forEach(channel => {
            const div = document.createElement('div');
            div.className = 'channel-item';
            div.innerHTML = `
                <div class="item-avatar">${(channel.title || '?')[0].toUpperCase()}</div>
                <div class="item-info">
                    <div class="item-name">${channel.title}</div>
                    <div class="item-preview">${channel.participantsCount || 0} subscribers</div>
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Load contacts
     */
    async loadContacts() {
        try {
            const result = await API.account.contacts(this.currentPhone);
            
            if (result.success) {
                this.renderContacts(result.contacts);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }
    
    /**
     * Render contacts list
     */
    renderContacts(contacts) {
        const container = document.getElementById('contacts-list');
        container.innerHTML = '';
        
        if (contacts.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">📇</div><p>No contacts found</p></div>';
            return;
        }
        
        contacts.forEach(contact => {
            const div = document.createElement('div');
            div.className = 'contact-item';
            div.innerHTML = `
                <div class="item-avatar">${(contact.firstName || contact.username || '?')[0].toUpperCase()}</div>
                <div class="item-info">
                    <div class="item-name">${contact.firstName || ''} ${contact.lastName || ''}</div>
                    <div class="item-preview">@${contact.username || 'no username'}</div>
                </div>
                <div class="item-meta">
                    <span class="status-dot ${contact.online ? 'online' : ''}"></span>
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Load automation rules
     */
    async loadAutomationRules() {
        try {
            const result = await API.automation.rules();
            
            if (result.success) {
                this.renderRules(result.rules);
            }
        } catch (error) {
            console.error('Error loading rules:', error);
        }
    }
    
    /**
     * Render automation rules
     */
    renderRules(rules) {
        const container = document.getElementById('rules-list');
        container.innerHTML = '';
        
        if (rules.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="icon">🤖</div><p>No automation rules</p></div>';
            return;
        }
        
        rules.forEach(rule => {
            const div = document.createElement('div');
            div.className = 'rule-item';
            div.innerHTML = `
                <div class="rule-info">
                    <h4>${rule.name} <span class="rule-type">${rule.type}</span></h4>
                    <p>Created: ${new Date(rule.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="rule-actions">
                    <label class="toggle-switch">
                        <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="app.toggleRule(${rule.id})">
                        <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-sm btn-secondary" onclick="app.editRule(${rule.id})">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="app.deleteRule(${rule.id})">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Load logs
     */
    async loadLogs() {
        try {
            const result = await API.system.logs(100);
            
            if (result.success) {
                this.renderLogs(result.logs);
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }
    
    /**
     * Render logs
     */
    renderLogs(logs) {
        const container = document.getElementById('logs-list');
        container.innerHTML = '';
        
        logs.forEach(log => {
            const div = document.createElement('div');
            div.className = 'log-item';
            div.innerHTML = `
                <span class="log-time">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="log-action">${log.action}</span>
                <span class="log-status ${log.status}">${log.status}</span>
            `;
            container.appendChild(div);
        });
    }
    
    /**
     * Open chat
     */
    async openChat(chatId) {
        this.currentChatId = chatId;
        this.switchView('chat-detail');
        
        try {
            const result = await API.chat.messages(this.currentPhone, chatId, 50);
            
            if (result.success) {
                this.renderMessages(result.messages);
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Render messages
     */
    renderMessages(messages) {
        const container = document.getElementById('messages-list');
        container.innerHTML = '';
        
        messages.reverse().forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.out ? 'outgoing' : 'incoming'}`;
            div.innerHTML = `
                <div class="message-text">${this.escapeHtml(msg.text || '')}</div>
                <div class="message-time">${this.formatTime(msg.date)}</div>
            `;
            container.appendChild(div);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    /**
     * Send chat message
     */
    async sendChatMessage() {
        const input = document.getElementById('message-input');
        const message = input.value.trim();
        
        if (!message || !this.currentChatId) return;
        
        try {
            await API.chat.sendDirect(this.currentPhone, this.currentChatId, message);
            input.value = '';
            
            // Add message to UI
            const container = document.getElementById('messages-list');
            const div = document.createElement('div');
            div.className = 'message outgoing';
            div.innerHTML = `
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Join group
     */
    async joinGroup() {
        const input = document.getElementById('join-group-input');
        const link = input.value.trim();
        
        if (!link) {
            this.showToast('Please enter invite link', 'error');
            return;
        }
        
        try {
            const result = await API.group.join(this.currentPhone, link);
            
            if (result.success) {
                this.showToast('Joined group successfully!', 'success');
                input.value = '';
                this.loadGroups();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Leave group
     */
    async leaveGroup(chatId) {
        if (!confirm('Are you sure you want to leave this group?')) return;
        
        try {
            const result = await API.group.leave(this.currentPhone, chatId);
            
            if (result.success) {
                this.showToast('Left group', 'success');
                this.loadGroups();
            }
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Toggle automation rule
     */
    async toggleRule(id) {
        try {
            await API.automation.toggle(id);
            this.loadAutomationRules();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Delete automation rule
     */
    async deleteRule(id) {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        
        try {
            await API.automation.delete(id);
            this.showToast('Rule deleted', 'success');
            this.loadAutomationRules();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }
    
    /**
     * Show create rule modal
     */
    showCreateRuleModal() {
        this.showModal('Create Automation Rule', `
            <div class="form-group">
                <label>Rule Name</label>
                <input type="text" id="rule-name" class="input" placeholder="My Auto-Reply">
            </div>
            <div class="form-group">
                <label>Type</label>
                <select id="rule-type" class="input">
                    <option value="auto_reply">Auto-Reply</option>
                    <option value="auto_forward">Auto-Forward</option>
                    <option value="auto_post">Auto-Post</option>
                </select>
            </div>
            <div class="form-group">
                <label>Trigger Keyword</label>
                <input type="text" id="rule-keyword" class="input" placeholder="hello">
            </div>
            <div class="form-group">
                <label>Response Message</label>
                <textarea id="rule-response" class="input" placeholder="Hello! How can I help you?"></textarea>
            </div>
        `, async () => {
            const name = document.getElementById('rule-name').value;
            const type = document.getElementById('rule-type').value;
            const keyword = document.getElementById('rule-keyword').value;
            const response = document.getElementById('rule-response').value;
            
            try {
                await API.automation.create(name, type, {
                    triggers: [{ type: 'keyword', value: keyword }],
                    actions: [{ type: 'reply', message: response }],
                    conditions: {},
                    delay: 1000
                });
                
                this.showToast('Rule created!', 'success');
                this.hideModal();
                this.loadAutomationRules();
            } catch (error) {
                this.showToast(error.message, 'error');
            }
        });
    }
    
    /**
     * Handle new message from socket
     */
    handleNewMessage(data) {
        if (data.chatId === this.currentChatId) {
            const container = document.getElementById('messages-list');
            const div = document.createElement('div');
            div.className = 'message incoming';
            div.innerHTML = `
                <div class="message-text">${this.escapeHtml(data.text || '')}</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
        
        // Refresh chat list
        this.loadChats();
    }
    
    /**
     * Switch view
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('active');
        });
        
        // Show selected view
        const view = document.getElementById(`view-${viewName}`);
        if (view) {
            view.classList.remove('hidden');
            view.classList.add('active');
        }
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.view === viewName) {
                item.classList.add('active');
            }
        });
        
        // Load data for view
        if (viewName === 'logs') {
            this.loadLogs();
        }
    }
    
    /**
     * Show login step
     */
    showStep(step) {
        document.querySelectorAll('.login-step').forEach(s => s.classList.add('hidden'));
        document.getElementById(`step-${step}`).classList.remove('hidden');
    }
    
    /**
     * Show login screen
     */
    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
    
    /**
     * Show dashboard
     */
    showDashboard() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
    }
    
    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-status');
        if (connected) {
            indicator.classList.add('connected');
            indicator.querySelector('.text').textContent = 'Connected';
        } else {
            indicator.classList.remove('connected');
            indicator.querySelector('.text').textContent = 'Disconnected';
        }
    }
    
    /**
     * Update queue status
     */
    updateQueueStatus(data) {
        const count = document.querySelector('#queue-status .count');
        if (count) {
            count.textContent = data.pending || 0;
        }
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('theme', this.theme);
    }
    
    /**
     * Apply theme
     */
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const btn = document.getElementById('theme-toggle');
        btn.textContent = this.theme === 'light' ? '🌙' : '☀️';
    }
    
    /**
     * Search chats
     */
    searchChats(query) {
        const items = document.querySelectorAll('.chat-item');
        items.forEach(item => {
            const name = item.querySelector('.item-name').textContent.toLowerCase();
            item.style.display = name.includes(query.toLowerCase()) ? '' : 'none';
        });
    }
    
    /**
     * Show modal
     */
    showModal(title, content, onConfirm) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal').classList.remove('hidden');
        
        document.getElementById('modal-confirm').onclick = onConfirm;
    }
    
    /**
     * Hide modal
     */
    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    /**
     * Show loading
     */
    showLoading() {
        document.getElementById('loading-screen').classList.remove('hidden');
    }
    
    /**
     * Hide loading
     */
    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }
    
    /**
     * Format time
     */
    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app
const app = new LiveGramApp();
