/**
 * LiveGramJS - Socket.IO Client
 */

const SocketClient = {
    socket: null,
    connected: false,
    currentPhone: null,
    
    // Event handlers
    handlers: {
        onConnectionStatus: null,
        onAccountStatus: null,
        onNewMessage: null,
        onMessageEdit: null,
        onMessageDelete: null,
        onUserStatus: null,
        onChatAction: null,
        onQueueStatus: null,
        onError: null
    },
    
    /**
     * Initialize socket connection
     */
    init() {
        this.socket = io({
            transports: ['websocket', 'polling']
        });
        
        this.setupEventListeners();
    },
    
    /**
     * Setup socket event listeners
     */
    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');
            this.connected = true;
            
            if (this.currentPhone) {
                this.subscribe(this.currentPhone);
            }
            
            if (this.handlers.onConnectionStatus) {
                this.handlers.onConnectionStatus({ connected: true });
            }
        });
        
        this.socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            this.connected = false;
            
            if (this.handlers.onConnectionStatus) {
                this.handlers.onConnectionStatus({ connected: false });
            }
        });
        
        this.socket.on('connection_status', (data) => {
            console.log('Connection status:', data);
        });
        
        this.socket.on('account_status', (data) => {
            if (this.handlers.onAccountStatus) {
                this.handlers.onAccountStatus(data);
            }
        });
        
        this.socket.on('message', (data) => {
            console.log('📩 New message:', data);
            if (this.handlers.onNewMessage) {
                this.handlers.onNewMessage(data);
            }
        });
        
        this.socket.on('message_edit', (data) => {
            if (this.handlers.onMessageEdit) {
                this.handlers.onMessageEdit(data);
            }
        });
        
        this.socket.on('message_delete', (data) => {
            if (this.handlers.onMessageDelete) {
                this.handlers.onMessageDelete(data);
            }
        });
        
        this.socket.on('user_status', (data) => {
            if (this.handlers.onUserStatus) {
                this.handlers.onUserStatus(data);
            }
        });
        
        this.socket.on('chat_action', (data) => {
            if (this.handlers.onChatAction) {
                this.handlers.onChatAction(data);
            }
        });
        
        this.socket.on('queue_status', (data) => {
            if (this.handlers.onQueueStatus) {
                this.handlers.onQueueStatus(data);
            }
        });
        
        this.socket.on('sessions_list', (data) => {
            console.log('Sessions:', data);
        });
        
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
            if (this.handlers.onError) {
                this.handlers.onError(data);
            }
        });
        
        this.socket.on('message_sent', (data) => {
            console.log('Message sent:', data);
        });
        
        this.socket.on('group_joined', (data) => {
            console.log('Group joined:', data);
        });
        
        this.socket.on('group_left', (data) => {
            console.log('Group left:', data);
        });
    },
    
    /**
     * Subscribe to account updates
     */
    subscribe(phone) {
        this.currentPhone = phone;
        if (this.connected) {
            this.socket.emit('subscribe', { phone });
        }
    },
    
    /**
     * Unsubscribe from account updates
     */
    unsubscribe(phone) {
        if (this.connected) {
            this.socket.emit('unsubscribe', { phone });
        }
        this.currentPhone = null;
    },
    
    /**
     * Send message via socket
     */
    sendMessage(phone, chatId, message) {
        if (this.connected) {
            this.socket.emit('send_message', { phone, chatId, message });
        }
    },
    
    /**
     * Join group via socket
     */
    joinGroup(phone, inviteLink) {
        if (this.connected) {
            this.socket.emit('join_group', { phone, inviteLink });
        }
    },
    
    /**
     * Leave group via socket
     */
    leaveGroup(phone, chatId) {
        if (this.connected) {
            this.socket.emit('leave_group', { phone, chatId });
        }
    },
    
    /**
     * Get queue status
     */
    getQueueStatus() {
        if (this.connected) {
            this.socket.emit('get_queue_status');
        }
    },
    
    /**
     * Get sessions list
     */
    getSessions() {
        if (this.connected) {
            this.socket.emit('get_sessions');
        }
    },
    
    /**
     * Set event handler
     */
    on(event, handler) {
        if (this.handlers.hasOwnProperty(event)) {
            this.handlers[event] = handler;
        }
    },
    
    /**
     * Disconnect socket
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
};

// Export for use
window.SocketClient = SocketClient;
