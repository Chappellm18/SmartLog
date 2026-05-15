import * as vscode from 'vscode';
import { WebSocketServer } from 'ws';

let server: WebSocketServer | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('LogAnalyzer Extension is now active.');

    // 1. Create an Output Channel to see logs before we build the Webview UI
    const logChannel = vscode.window.createOutputChannel("Log Analyzer Stream");
    logChannel.show();

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(radio-tower) Log Server: Active";
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

    // 2. Start the WebSocket Server
    server = new WebSocketServer({ port: 9000 });

    server.on('connection', (socket) => {
        logChannel.appendLine('✅ App Connected to Log Analyzer');

        socket.on('message', (data) => {
            try {
                const logEntry = JSON.parse(data.toString());
                
                // Format the log for the output channel
                const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
                const output = `[${timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
                
                logChannel.appendLine(output);

                // Optional: If there's an error, let's make it stand out
                if (logEntry.level === 'error') {
                    vscode.window.showErrorMessage(`Log Error: ${logEntry.message}`);
                }
            } catch (err) {
                logChannel.appendLine(`❌ Failed to parse log: ${err}`);
            }
        });

        socket.on('close', () => {
            logChannel.appendLine('🔌 App Disconnected');
        });
    });

    // 3. Register a command to manually stop/start if needed
    let disposable = vscode.commands.registerCommand('loganalyzer.startServer', () => {
        vscode.window.showInformationMessage('Log Server is running on port 9000');
    });

    context.subscriptions.push(disposable);
}

// Clean up when extension is deactivated
export function deactivate() {
    if (server) {
        server.close();
    }
}