"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const uuid_1 = require("uuid");
const ws_1 = __importDefault(require("ws"));
class Logger {
    port;
    socket = null;
    queue = [];
    isConnected = false;
    constructor(port = 9000) {
        this.port = port;
        this.connect();
    }
    connect() {
        this.socket = new ws_1.default(`ws://localhost:${this.port}`);
        this.socket.on('open', () => {
            this.isConnected = true;
            this.flushQueue();
        });
        this.socket.on('close', () => {
            this.isConnected = false;
            // Try to reconnect every 3 seconds
            setTimeout(() => this.connect(), 3000);
        });
        this.socket.on('error', () => {
            this.isConnected = false;
            this.socket?.close();
        });
    }
    flushQueue() {
        while (this.queue.length > 0 && this.isConnected) {
            const log = this.queue.shift();
            this.socket?.send(JSON.stringify(log));
        }
    }
    getCallerInfo() {
        const err = new Error();
        const stack = err.stack?.split('\n')[3];
        const match = stack?.match(/\((.*):(\d+):(\d+)\)/);
        if (match) {
            return {
                file: match[1],
                line: parseInt(match[2] ?? '0'),
                column: parseInt(match[3] ?? '0')
            };
        }
        return null;
    }
    log(level, message, context) {
        const payload = {
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
            level,
            message,
            context,
            source: this.getCallerInfo()
        };
        console.log(`[${level}] ${message}`);
        if (this.isConnected) {
            this.socket?.send(this.safeStringify(payload));
        }
        else {
            this.queue.push(payload); // Buffer if extension is closed
        }
    }
    safeStringify(obj) {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value))
                    return '[Circular]';
                cache.add(value);
            }
            return value;
        });
    }
    info(msg, ctx) { this.log('info', msg, ctx); }
    error(msg, ctx) { this.log('error', msg, ctx); }
    warn(msg, ctx) { this.log('warn', msg, ctx); }
    debug(msg, ctx) { this.log('debug', msg, ctx); }
}
exports.Logger = Logger;
