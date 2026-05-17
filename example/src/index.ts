// 1. Import the linked logger package
import { Logger } from 'smartlog';

// 2. Instantiate the logger (defaults to port 9000)
const logger = new Logger(9000);

console.log("--- Starting Logger Test Script ---");

// Test 1: Immediate Logging (Will queue if your server isn't running yet)
logger.info("Application initialized successfully.");
logger.debug("Testing a debug log statement.");

// Test 2: Logging with structured context data
logger.warn("High memory usage detected!", {
    memoryUsage: "85%",
    processId: process.pid
});

// Test 3: Simulate an application error
try {
    throw new Error("Database connection timeout!");
} catch (error: any) {
    logger.error("Caught a critical system error", {
        errorMessage: error?.message,
        stack: error?.stack
    });
}

// Test 4: Verify the queue mechanism
// This log will fire in 5 seconds. If your WebSocket server was offline 
// but you start it up during these 5 seconds, all previous logs plus 
// this one will suddenly flush to the server!
setTimeout(() => {
    logger.info("Delayed log sent to test WebSocket reconnection and flushing.");
}, 5000);