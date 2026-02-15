/**
 * LiveGramJS Database Initialization
 * Creates SQLite database and tables
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '../../data/livegramjs.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

console.log('✅ Database initialized successfully');
console.log(`📁 Database location: ${DB_PATH}`);

// Export database instance
module.exports = db;
