/**
 * LiveGramJS - GramJS Client Manager
 * Manages Telegram client connections using GramJS (MTProto)
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');
const config = require('../../../config/config.json');

class GramJSManager {
    constructor() {
        this.clients = new Map(); // phone -> client instance
        this.sessions = new Map(); // phone -> session string
        this.config = config;
        this.sessionPath = path.resolve(config.session.path);
        
        // Ensure session directory exists
        if (!fs.existsSync(this.sessionPath)) {
            fs.mkdirSync(this.sessionPath, { recursive: true });
        }
    }

    /**
     * Get API credentials
     */
    getApiCredentials() {
        return {
            apiId: parseInt(this.config.telegram.apiId) || 0,
            apiHash: this.config.telegram.apiHash || ''
        };
    }

    /**
     * Encrypt session data
     */
    encryptSession(sessionString) {
        if (!this.config.session.encrypted) return sessionString;
        return CryptoJS.AES.encrypt(sessionString, this.config.session.password).toString();
    }

    /**
     * Decrypt session data
     */
    decryptSession(encryptedSession) {
        if (!this.config.session.encrypted) return encryptedSession;
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedSession, this.config.session.password);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            return '';
        }
    }

    /**
     * Get session file path
     */
    getSessionFilePath(phone) {
        return path.join(this.sessionPath, `${phone}.json`);
    }

    /**
     * Save session to file
     */
    saveSession(phone, sessionString, userData = {}) {
        const sessionFile = this.getSessionFilePath(phone);
        const data = {
            phone,
            session: this.encryptSession(sessionString),
            userId: userData.id || null,
            username: userData.username || null,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            savedAt: new Date().toISOString()
        };
        fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
        console.log(`💾 Session saved for ${phone}`);
    }

    /**
     * Load session from file
     */
    loadSession(phone) {
        const sessionFile = this.getSessionFilePath(phone);
        if (!fs.existsSync(sessionFile)) {
            return null;
        }
        try {
            const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            return {
                session: this.decryptSession(data.session),
                ...data
            };
        } catch (e) {
            console.error(`❌ Error loading session for ${phone}:`, e.message);
            return null;
        }
    }

    /**
     * Delete session file
     */
    deleteSession(phone) {
        const sessionFile = this.getSessionFilePath(phone);
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
            console.log(`🗑️ Session deleted for ${phone}`);
        }
    }

    /**
     * Check if session exists
     */
    hasSession(phone) {
        return fs.existsSync(this.getSessionFilePath(phone));
    }

    /**
     * List all saved sessions
     */
    listSessions() {
        const files = fs.readdirSync(this.sessionPath);
        const sessions = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const phone = file.replace('.json', '');
                const data = this.loadSession(phone);
                if (data) {
                    sessions.push({
                        phone,
                        username: data.username,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        savedAt: data.savedAt
                    });
                }
            }
        }
        return sessions;
    }

    /**
     * Create new Telegram client
     */
    createClient(phone, sessionString = '') {
        const { apiId, apiHash } = this.getApiCredentials();
        
        if (!apiId || !apiHash || apiHash === 'YOUR_API_HASH') {
            throw new Error('API ID dan API Hash belum dikonfigurasi. Silakan edit config/config.json');
        }

        const stringSession = new StringSession(sessionString);
        const client = new TelegramClient(stringSession, apiId, apiHash, {
            connectionRetries: 5,
            useWSS: false,
            testServers: false
        });

        return client;
    }

    /**
     * Get or create client
     */
    getClient(phone) {
        if (this.clients.has(phone)) {
            return this.clients.get(phone);
        }

        const sessionData = this.loadSession(phone);
        const sessionString = sessionData ? sessionData.session : '';
        const client = this.createClient(phone, sessionString);
        
        this.clients.set(phone, client);
        return client;
    }

    /**
     * Connect client to Telegram
     */
    async connectClient(phone) {
        const client = this.getClient(phone);
        
        if (client.connected) {
            return { success: true, message: 'Already connected' };
        }

        try {
            await client.connect();
            console.log(`✅ Client connected: ${phone}`);
            return { success: true, message: 'Connected successfully' };
        } catch (e) {
            console.error(`❌ Connection error for ${phone}:`, e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Disconnect client
     */
    async disconnectClient(phone) {
        const client = this.clients.get(phone);
        if (client) {
            try {
                await client.disconnect();
                this.clients.delete(phone);
                console.log(`🔌 Client disconnected: ${phone}`);
                return { success: true };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
        return { success: true };
    }

    /**
     * Send verification code
     */
    async sendCode(phone) {
        const client = this.createClient(phone);
        
        try {
            await client.connect();
            
            const { apiId, apiHash } = this.getApiCredentials();
            
            console.log(`📱 Sending code to ${phone}...`);
            console.log(`   API ID: ${apiId} (type: ${typeof apiId})`);
            
            // Use Api.auth.SendCode directly with proper constructor
            const result = await client.invoke(
                new Api.auth.SendCode({
                    phoneNumber: phone,
                    apiId: apiId,
                    apiHash: apiHash,
                    settings: new Api.CodeSettings()
                })
            );

            // Store phone code hash for verification
            this.phoneCodeHash = this.phoneCodeHash || new Map();
            this.phoneCodeHash.set(phone, result.phoneCodeHash);

            // Store temporary client
            this.tempClients = this.tempClients || new Map();
            this.tempClients.set(phone, client);

            console.log(`✅ Code sent to ${phone}`);

            return {
                success: true,
                phoneCodeHash: result.phoneCodeHash,
                message: 'Verification code sent'
            };
        } catch (e) {
            console.error(`❌ Send code error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Verify code and sign in
     */
    async verifyCode(phone, code, phoneCodeHash = null) {
        const hash = phoneCodeHash || (this.phoneCodeHash && this.phoneCodeHash.get(phone));
        
        if (!hash) {
            return { success: false, error: 'Phone code hash not found. Please send code first.' };
        }

        let client = (this.tempClients && this.tempClients.get(phone)) || this.getClient(phone);

        try {
            if (!client.connected) {
                await client.connect();
            }

            console.log(`🔐 Verifying code for ${phone}...`);

            // Use Api.auth.SignIn with proper constructor
            const result = await client.invoke(
                new Api.auth.SignIn({
                    phoneNumber: phone,
                    phoneCodeHash: hash,
                    phoneCode: code
                })
            );

            // Get user info
            const me = await client.getMe();
            
            // Save session
            const sessionString = client.session.save();
            this.saveSession(phone, sessionString, {
                id: me.id?.toString(),
                username: me.username,
                firstName: me.firstName,
                lastName: me.lastName
            });

            // Store client
            this.clients.set(phone, client);
            
            // Cleanup temp
            if (this.tempClients) this.tempClients.delete(phone);
            if (this.phoneCodeHash) this.phoneCodeHash.delete(phone);

            console.log(`✅ Login successful: ${phone}`);
            
            return {
                success: true,
                user: {
                    id: me.id?.toString(),
                    phone: me.phone,
                    username: me.username,
                    firstName: me.firstName,
                    lastName: me.lastName
                }
            };
        } catch (e) {
            console.error(`❌ Verify code error:`, e.message);
            
            // Check if 2FA is required
            if (e.message.includes('SESSION_PASSWORD_NEEDED')) {
                return {
                    success: false,
                    requires2FA: true,
                    error: 'Two-factor authentication required'
                };
            }
            
            return { success: false, error: e.message };
        }
    }

    /**
     * Sign in with 2FA password
     */
    async signIn2FA(phone, password) {
        const client = (this.tempClients && this.tempClients.get(phone)) || this.getClient(phone);

        try {
            if (!client.connected) {
                await client.connect();
            }

            // Use GramJS built-in method for 2FA
            await client.signInUser(phone, {
                password: () => password
            });

            // Get user info
            const me = await client.getMe();
            
            // Save session
            const sessionString = client.session.save();
            this.saveSession(phone, sessionString, {
                id: me.id?.toString(),
                username: me.username,
                firstName: me.firstName,
                lastName: me.lastName
            });

            this.clients.set(phone, client);

            return {
                success: true,
                user: {
                    id: me.id?.toString(),
                    phone: me.phone,
                    username: me.username,
                    firstName: me.firstName,
                    lastName: me.lastName
                }
            };
        } catch (e) {
            console.error(`❌ 2FA sign in error:`, e.message);
            return { success: false, error: e.message };
        }
    }

    /**
     * Logout and delete session
     */
    async logout(phone) {
        const client = this.clients.get(phone);
        
        if (client) {
            try {
                await client.invoke(new Api.auth.LogOut());
                await this.disconnectClient(phone);
            } catch (e) {
                console.error('Logout error:', e.message);
            }
        }

        this.deleteSession(phone);
        return { success: true, message: 'Logged out successfully' };
    }

    /**
     * Get current user info
     */
    async getMe(phone) {
        const client = this.getClient(phone);
        
        try {
            if (!client.connected) {
                await client.connect();
            }
            
            const me = await client.getMe();
            return {
                success: true,
                user: {
                    id: me.id?.toString(),
                    phone: me.phone,
                    username: me.username,
                    firstName: me.firstName,
                    lastName: me.lastName,
                    online: me.status?.className === 'UserStatusOnline'
                }
            };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Check if client is connected
     */
    isConnected(phone) {
        const client = this.clients.get(phone);
        return client && client.connected;
    }
}

// Export singleton instance
module.exports = new GramJSManager();
