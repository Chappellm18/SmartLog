import { v4 as uuidv4 } from 'uuid';
import WebSocket from 'ws';

export class Logger {
    private socket: WebSocket | null = null;
    private queue: any[] = [];
    private isConnected = false;

    constructor(private port: number = 9000) {
        this.connect();
    }

    private connect() {
        this.socket = new WebSocket(`ws://localhost:${this.port}`);

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

    private flushQueue() {
        while (this.queue.length > 0 && this.isConnected) {
            const log = this.queue.shift();
            this.socket?.send(JSON.stringify(log));
        }
    }

    private getCallerInfo() {
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

    public log(level: string, message: string, context?: any) {
        const payload = {
            id: uuidv4(),
            timestamp: Date.now(),
            level,
            message,
            context,
            source: this.getCallerInfo()
        };

        console.log(`[${level}] ${message}`);

        if (this.isConnected) {
            this.socket?.send(this.safeStringify(payload));
        } else {
            this.queue.push(payload); // Buffer if extension is closed
        }
    }

    private safeStringify(obj: any) {
        const cache = new Set();
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) return '[Circular]';
                cache.add(value);
            }
            return value;
        });
    }

    public info(msg: string, ctx?: any) { this.log('info', msg, ctx); }
    public error(msg: string, ctx?: any) { this.log('error', msg, ctx); }
    public warn(msg: string, ctx?: any) { this.log('warn', msg, ctx); }
    public debug(msg: string, ctx?: any) { this.log('debug', msg, ctx); }
}