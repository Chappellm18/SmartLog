"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const sqlite_1 = require("sqlite");
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db;
// 1. Initialize SQLite Database
async function initDatabase() {
    const dbFolder = path_1.default.resolve(process.cwd(), '..', 'db');
    const dbPath = path_1.default.join(dbFolder, 'smartlog.db');
    // Automatically create the 'db' folder if it doesn't exist yet
    if (!fs_1.default.existsSync(dbFolder)) {
        fs_1.default.mkdirSync(dbFolder, { recursive: true });
        console.log(`📁 Created missing database directory at: ${dbFolder}`);
    }
    db = await (0, sqlite_1.open)({
        filename: dbPath,
        driver: sqlite3_1.default.Database
    });
    // Create the logs table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            timestamp INTEGER NOT NULL,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            file TEXT,
            line INTEGER,
            column INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
    `);
    console.log('🗄️  SQLite database initialized and indexed.');
}
// 2. Setup Express Rest API
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API Endpoint: Get all logs (with optional level filtering)
app.get('/api/logs', async (req, res) => {
    try {
        const level = req.query.level;
        let query = 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1000';
        let params = [];
        if (level) {
            query = 'SELECT * FROM logs WHERE level = ? ORDER BY timestamp DESC LIMIT 1000';
            params = [level.toLowerCase()];
        }
        const rows = await db.all(query, params);
        // Parse the context string back into an object before sending to UI
        const formattedRows = rows.map(row => ({
            ...row,
            context: row.context ? JSON.parse(row.context) : null,
            source: row.file ? { file: row.file, line: row.line, column: row.column } : null
        }));
        res.json(formattedRows);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// API Endpoint: Clear the Database
app.delete('/api/logs', async (req, res) => {
    try {
        await db.run('DELETE FROM logs');
        res.json({ message: 'Database logs cleared successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. Start Servers
const HTTP_PORT = 3000;
const WS_PORT = 9000;
async function start() {
    await initDatabase();
    // Start HTTP REST API
    app.listen(HTTP_PORT, () => {
        console.log(`🌐 HTTP REST API running on http://localhost:${HTTP_PORT}`);
    });
    // Start WebSocket Ingestion Server
    const wss = new ws_1.WebSocketServer({ port: WS_PORT });
    wss.on('connection', (ws) => {
        console.log('🔌 New application stream connected via WebSocket');
        ws.on('message', async (rawData) => {
            try {
                const log = JSON.parse(rawData.toString());
                if (log.level && log.message) {
                    // Extract fields from source payload safely
                    const file = log.source?.file || null;
                    const line = log.source?.line || null;
                    const column = log.source?.column || null;
                    // Flatten context into a JSON string for text storage
                    const contextString = log.context ? JSON.stringify(log.context) : null;
                    await db.run(`INSERT INTO logs (id, timestamp, level, message, context, file, line, column) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [log.id, log.timestamp, log.level, log.message, contextString, file, line, column]);
                    console.log(`[${log.level.toUpperCase()}] ${log.message}`);
                }
            }
            catch (err) {
                console.error('❌ Failed to save incoming log to SQLite:', err);
            }
        });
    });
    console.log(`🚀 WebSocket Ingestion Server listening on ws://localhost:${WS_PORT}`);
}
start().catch(console.error);
