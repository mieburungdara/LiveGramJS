# LiveGramJS - Sistem CRM Telegram Berbasis Web

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**Sistem manajemen akun Telegram berbasis web yang lengkap dengan fitur automasi pesan, manajemen grup/channel, dan kontrol performa.**

[Fitur](#-fitur-utama) • [Instalasi](#-instalasi) • [Penggunaan](#-penggunaan) • [API](#-api-endpoints) • [Kontribusi](#-kontribusi)

</div>

---

## 📖 Tentang Project

LiveGramJS adalah sistem CRM (Customer Relationship Management) untuk Telegram yang memungkinkan Anda mengelola akun Telegram secara penuh melalui browser. Dibangun dengan Node.js, Express.js, dan GramJS (MTProto), sistem ini menyediakan dashboard web yang user-friendly untuk mengelola pesan, grup, channel, dan automasi.

### Mengapa LiveGramJS?

- 🌐 **Akses via Browser** - Kelola akun Telegram dari browser tanpa perlu aplikasi desktop
- 🔄 **Real-time Updates** - Pesan baru langsung muncul tanpa refresh
- 🤖 **Automation Built-in** - Auto-reply, auto-forward, auto-post sudah tersedia
- 💾 **Session Persistent** - Session tersimpan, tidak hilang saat server restart
- 🎨 **Dashboard Modern** - UI responsive dengan dark/light mode
- 🔒 **Aman** - Session dienkripsi, rate limiting, input validation

---

## ✨ Fitur Utama

### 🔐 Authentication & Session Management
- Login dengan nomor telepon dan kode verifikasi
- Dukungan Two-Factor Authentication (2FA)
- Multi-account support dengan switch antar akun
- Session tersimpan otomatis di file terenkripsi
- Logout yang membersihkan session dengan aman

### 👤 Manajemen Akun
- Tampilkan profil lengkap (username, nama, bio, avatar)
- Daftar kontak dengan informasi detail
- Daftar grup dan channel yang diikuti
- Daftar chat aktif dengan preview pesan terakhir
- Update profil (nama, bio)

### 👥 Manajemen Grup & Channel
- Join grup via invite link atau username
- Keluar dari grup/channel
- Buat grup baru
- Buat channel baru
- Invite member ke grup
- Promote user menjadi admin
- Lihat daftar member grup

### 💬 Chat & Pesan
- Histori chat dengan infinite scroll
- Kirim pesan langsung dari dashboard
- Forward pesan ke chat lain
- Hapus pesan
- Tandai pesan sudah dibaca
- Search dalam histori chat
- Real-time pesan masuk

### 🤖 Automasi Pesan
- **Auto-Reply** - Balas otomatis berdasarkan keyword atau regex
- **Auto-Forward** - Forward otomatis dengan filter
- **Auto-Post** - Post otomatis ke channel
- Dashboard untuk manage rules
- Enable/disable rules secara real-time
- Kondisi dan trigger yang dapat dikonfigurasi

### ⚡ Kontrol Performa
- **Delay System** - Delay antar aksi untuk menghindari spam detection
- **Rate Limiting** - Batasi request per detik
- **Queue System** - Antrian aksi yang diproses berurutan
- **Activity Logs** - Log semua aktivitas untuk debugging

### 🎨 Interface
- Dashboard responsive (mobile/tablet/desktop)
- Dark/Light mode toggle
- Real-time notifications via WebSocket
- Toast notifications
- Loading states dan progress indicators

---

## 📋 Persyaratan Sistem

- **Node.js** versi 16.0.0 atau lebih tinggi
- **npm** atau **yarn**
- **API ID & Hash** dari [my.telegram.org](https://my.telegram.org)
- Koneksi internet yang stabil

---

## 🚀 Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/username/LiveGramJS.git
cd LiveGramJS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Konfigurasi

Edit file `config/config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "telegram": {
    "apiId": "YOUR_API_ID",
    "apiHash": "YOUR_API_HASH"
  },
  "session": {
    "encrypted": true,
    "password": "ganti-dengan-password-yang-kuat",
    "path": "./sessions"
  },
  "performance": {
    "defaultDelay": 1000,
    "rateLimit": 10,
    "maxRetries": 3
  },
  "security": {
    "apiRateLimit": 100,
    "allowedOrigins": ["http://localhost:3000"]
  }
}
```

**Cara mendapatkan API ID & Hash:**
1. Buka [my.telegram.org](https://my.telegram.org)
2. Login dengan nomor Telegram Anda
3. Pilih "API development tools"
4. Buat aplikasi baru jika belum ada
5. Salin `api_id` dan `api_hash`

### 4. Jalankan Server

```bash
# Production
npm start

# Development (dengan auto-reload)
npm run dev
```

### 5. Akses Dashboard

Buka browser dan akses: **http://localhost:3000**

---

## 📖 Penggunaan

### Login Pertama Kali

1. Buka http://localhost:3000 di browser
2. Masukkan nomor telepon dengan format international (contoh: +62812345678)
3. Klik "Send Verification Code"
4. Cek aplikasi Telegram Anda untuk kode verifikasi
5. Masukkan kode verifikasi
6. Jika akun Anda menggunakan 2FA, masukkan password

### Mengelola Chat

1. **Melihat Chat** - Klik menu "Chats" di sidebar
2. **Membuka Chat** - Klik pada chat yang ingin dibuka
3. **Kirim Pesan** - Ketik pesan di input box dan klik "Send"
4. **Search Chat** - Gunakan search box untuk mencari chat

### Mengelola Grup

1. **Join Grup** - Masukkan invite link atau @username, lalu klik "Join"
2. **Leave Grup** - Klik tombol "Leave" pada grup yang ingin ditinggalkan
3. **Buat Grup Baru** - Klik "Create Group" dan masukkan nama grup

### Mengatur Automasi

1. Klik menu "Automation" di sidebar
2. Klik "Create Rule" untuk membuat rule baru
3. Pilih tipe rule:
   - **Auto-Reply**: Balas otomatis pesan
   - **Auto-Forward**: Forward otomatis pesan
   - **Auto-Post**: Post otomatis ke channel
4. Konfigurasi trigger dan action
5. Enable/disable rule sesuai kebutuhan

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/send-code` | Kirim kode verifikasi |
| POST | `/api/auth/verify` | Verifikasi kode dan login |
| POST | `/api/auth/verify-2fa` | Verifikasi password 2FA |
| POST | `/api/auth/logout` | Logout dan hapus session |
| GET | `/api/auth/status` | Cek status login |
| GET | `/api/auth/sessions` | Daftar session tersimpan |
| POST | `/api/auth/connect` | Connect dengan session tersimpan |

### Account

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/account/me` | Get profil pengguna |
| GET | `/api/account/contacts` | Daftar kontak |
| GET | `/api/account/dialogs` | Daftar chat |
| GET | `/api/account/groups` | Daftar grup |
| GET | `/api/account/channels` | Daftar channel |
| PUT | `/api/account/profile` | Update profil |

### Chat

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/chat/messages` | Get histori pesan |
| POST | `/api/chat/send` | Kirim pesan (queued) |
| POST | `/api/chat/send-direct` | Kirim pesan langsung |
| POST | `/api/chat/forward` | Forward pesan |
| DELETE | `/api/chat/message` | Hapus pesan |
| POST | `/api/chat/read` | Tandai sudah dibaca |
| GET | `/api/chat/search` | Search pesan |

### Group & Channel

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/group/join` | Join grup |
| POST | `/api/group/leave` | Leave grup |
| POST | `/api/group/create` | Buat grup baru |
| POST | `/api/group/invite` | Invite member |
| GET | `/api/group/members` | Daftar member |
| POST | `/api/group/promote` | Promote ke admin |

### Automation

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/automation/rules` | Daftar rules |
| POST | `/api/automation/rules` | Buat rule baru |
| PUT | `/api/automation/rules/:id` | Update rule |
| DELETE | `/api/automation/rules/:id` | Hapus rule |
| POST | `/api/automation/rules/:id/toggle` | Toggle enable/disable |

---

## 📁 Struktur Project

```
LiveGramJS/
├── config/
│   └── config.json          # Konfigurasi sistem
├── src/
│   ├── backend/
│   │   ├── index.js         # Entry point server
│   │   ├── app.js           # Express app setup
│   │   ├── gramjs/
│   │   │   ├── manager.js   # GramJS client manager
│   │   │   └── events.js    # Event handlers
│   │   ├── api/
│   │   │   ├── auth.js      # Authentication endpoints
│   │   │   ├── account.js   # Account management
│   │   │   ├── chat.js      # Chat operations
│   │   │   ├── group.js     # Group/channel ops
│   │   │   └── automation.js # Automation rules
│   │   ├── automation/
│   │   │   └── engine.js    # Automation engine
│   │   ├── queue/
│   │   │   └── manager.js   # Queue processor
│   │   └── socket/
│   │       └── handler.js   # Socket.io handlers
│   ├── frontend/
│   │   ├── index.html       # Main HTML
│   │   ├── css/
│   │   │   └── style.css    # Styles
│   │   └── js/
│   │       ├── app.js       # Main app
│   │       ├── api.js       # API client
│   │       └── socket.js    # Socket client
│   └── database/
│       ├── schema.sql       # Database schema
│       └── init.js          # Database initialization
├── sessions/                # Session files storage
├── data/                    # SQLite database
├── logs/                    # Log files
├── package.json
├── README.md
└── SPEC.md
```

---

## 🔌 WebSocket Events

### Client → Server

| Event | Data | Deskripsi |
|-------|------|-----------|
| `subscribe` | `{ phone }` | Subscribe ke account updates |
| `send_message` | `{ phone, chatId, message }` | Kirim pesan |
| `join_group` | `{ phone, inviteLink }` | Join grup |
| `leave_group` | `{ phone, chatId }` | Leave grup |
| `get_queue_status` | - | Get status queue |

### Server → Client

| Event | Data | Deskripsi |
|-------|------|-----------|
| `message` | Message object | Pesan baru masuk |
| `message_edit` | Message object | Pesan diedit |
| `message_delete` | `{ chatId, messageIds }` | Pesan dihapus |
| `user_status` | `{ userId, status }` | Status user berubah |
| `chat_action` | `{ chatId, action }` | Aksi chat (typing, dll) |
| `queue_status` | Queue status | Status queue |

---

## ⚙️ Konfigurasi Lanjutan

### Performance Settings

```json
{
  "performance": {
    "defaultDelay": 1000,     // Delay default antar aksi (ms)
    "rateLimit": 10,          // Max request per detik
    "maxRetries": 3,          // Max retry untuk task gagal
    "queueConcurrency": 1     // Jumlah task paralel
  }
}
```

### Security Settings

```json
{
  "security": {
    "apiRateLimit": 100,      // Max API request per menit
    "allowedOrigins": [       // CORS origins
      "http://localhost:3000"
    ]
  }
}
```

---

## 🔒 Keamanan

- **Session Encryption** - Session dienkripsi menggunakan AES
- **Rate Limiting** - Mencegah spam dan abuse
- **Input Validation** - Validasi semua input untuk mencegah injection
- **CORS Protection** - Hanya origin yang diizinkan yang bisa akses
- **Audit Logging** - Semua aktivitas tercatat untuk audit

---

## 🛠️ Development

### Menjalankan dalam Mode Development

```bash
npm run dev
```

### Inisialisasi Database

```bash
npm run init-db
```

### Struktur Code

- **Backend** - Menggunakan Express.js dengan arsitektur MVC
- **Frontend** - Vanilla JavaScript dengan modular structure
- **Database** - SQLite dengan better-sqlite3
- **Real-time** - Socket.io untuk WebSocket

---

## ❓ FAQ

### Q: Apakah session hilang saat server di-restart?
**A:** Tidak. Session tersimpan di file terenkripsi dan akan di-load otomatis saat server start.

### Q: Apakah akun tetap berjalan saat browser ditutup?
**A:** Ya. Selama server masih berjalan, akun tetap terhubung dan automation tetap bekerja.

### Q: Berapa banyak akun yang bisa dikelola?
**A:** Tidak ada batasan. Anda bisa menambahkan akun sebanyak yang diperlukan.

### Q: Apakah aman menggunakan sistem ini?
**A:** Ya. Session dienkripsi dan semua komunikasi menggunakan MTProto (protokol resmi Telegram).

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan buat Pull Request atau Issue.

1. Fork repository ini
2. Buat branch fitur (`git checkout -b feature/fitur-baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/fitur-baru`)
5. Buat Pull Request

---

## 📄 Lisensi

Project ini dilisensikan di bawah [MIT License](LICENSE).

---

## 🙏 Credits

- [GramJS](https://github.com/gram-js/gramjs) - Telegram MTProto library untuk JavaScript
- [Express.js](https://expressjs.com/) - Web framework untuk Node.js
- [Socket.io](https://socket.io/) - Real-time bidirectional communication

---

<div align="center">

**Dibuat dengan ❤️ oleh Tim LiveGramJS**

[⬆ Kembali ke atas](#livegramjs---sistem-crm-telegram-berbasis-web)

</div>
