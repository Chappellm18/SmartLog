export declare class Logger {
    private port;
    private socket;
    private queue;
    private isConnected;
    constructor(port?: number);
    private connect;
    private flushQueue;
    private getCallerInfo;
    log(level: string, message: string, context?: any): void;
    private safeStringify;
    info(msg: string, ctx?: any): void;
    error(msg: string, ctx?: any): void;
    warn(msg: string, ctx?: any): void;
    debug(msg: string, ctx?: any): void;
}
