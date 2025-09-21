const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
    constructor() {
        this.wss = null;
        this.clients = new Set();
    }

    initialize(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/ws/translation-progress'
        });

        this.wss.on('connection', (ws, req) => {
            logger.info('WebSocket client connected', { ip: req.socket.remoteAddress });

            this.clients.add(ws);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    logger.debug('WebSocket message received', { data });

                    // Handle client messages if needed
                    this.handleClientMessage(ws, data);
                } catch (error) {
                    logger.error('Error parsing WebSocket message', { error: error.message });
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket client disconnected');
                this.clients.delete(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error', { error: error.message });
                this.clients.delete(ws);
            });

            // Send initial connection confirmation
            ws.send(JSON.stringify({
                type: 'connected',
                timestamp: new Date().toISOString()
            }));
        });

        logger.info('WebSocket server initialized');
    }

    handleClientMessage(ws, data) {
        // Handle different types of client messages
        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
                break;

            case 'subscribe':
                // Handle subscription to specific job updates
                ws.jobId = data.jobId;
                break;

            default:
                logger.debug('Unknown WebSocket message type', { type: data.type });
        }
    }

    // Broadcast to all connected clients
    broadcast(message) {
        const messageString = JSON.stringify(message);

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });

        logger.debug('WebSocket message broadcasted', {
            message: message.type,
            clientCount: this.clients.size
        });
    }

    // Send message to specific job subscribers
    sendToJob(jobId, message) {
        const messageString = JSON.stringify(message);

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client.jobId === jobId) {
                client.send(messageString);
            }
        });

        logger.debug('WebSocket message sent to job subscribers', {
            jobId,
            message: message.type
        });
    }

    // Translation progress events
    sendTranslationProgress(jobId, progress) {
        const message = {
            type: 'translation-progress',
            jobId,
            progress: progress.progress,
            currentItem: progress.currentItem,
            processedItems: progress.processedItems,
            totalItems: progress.totalItems,
            errors: progress.errors || [],
            timestamp: new Date().toISOString()
        };

        this.sendToJob(jobId, message);
    }

    sendJobStarted(jobId, totalItems) {
        const message = {
            type: 'job-started',
            jobId,
            totalItems,
            timestamp: new Date().toISOString()
        };

        this.sendToJob(jobId, message);
    }

    sendItemCompleted(jobId, postId, status, progress) {
        const message = {
            type: 'item-completed',
            jobId,
            postId,
            status,
            progress,
            timestamp: new Date().toISOString()
        };

        this.sendToJob(jobId, message);
    }

    sendJobCompleted(jobId, summary) {
        const message = {
            type: 'job-completed',
            jobId,
            summary,
            timestamp: new Date().toISOString()
        };

        this.sendToJob(jobId, message);
    }

    sendErrorOccurred(jobId, postId, error) {
        const message = {
            type: 'error-occurred',
            jobId,
            postId,
            error: {
                message: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            },
            timestamp: new Date().toISOString()
        };

        this.sendToJob(jobId, message);
    }

    getClientCount() {
        return this.clients.size;
    }
}

// Create singleton instance
const webSocketService = new WebSocketService();

// Setup function to be called from server
function setupWebSocket(server) {
    webSocketService.initialize(server);
    return webSocketService;
}

module.exports = {
    setupWebSocket,
    webSocketService
};