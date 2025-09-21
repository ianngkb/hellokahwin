const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initializeDatabase } = require('./config/database');
const contentRoutes = require('./routes/content');
const translationRoutes = require('./routes/translation');
const publishingRoutes = require('./routes/publishing');
const configRoutes = require('./routes/config');
const { errorHandler } = require('./middleware/errorHandler');
const { setupWebSocket } = require('./services/websocket');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

// API Routes
app.use('/api/content', contentRoutes);
app.use('/api/translation', translationRoutes);
app.use('/api/publishing', publishingRoutes);
app.use('/api/config', configRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Initialize database and start server
async function startServer() {
    try {
        console.log('Initializing database...');
        await initializeDatabase();
        console.log('✓ Database initialized successfully');

        const server = app.listen(PORT, () => {
            console.log(`✓ Server running on port ${PORT}`);
            console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Setup WebSocket for real-time updates
        setupWebSocket(server);
        console.log('✓ WebSocket server initialized');

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('Shutting down server gracefully...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;