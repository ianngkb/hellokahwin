const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        return JSON.stringify(logEntry);
    }

    writeToFile(level, message) {
        const filename = `${level}.log`;
        const filepath = path.join(this.logDir, filename);
        const logMessage = message + '\n';

        fs.appendFile(filepath, logMessage, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }

    log(level, message, meta = {}) {
        const formattedMessage = this.formatMessage(level, message, meta);

        // Console output
        console[level] ? console[level](formattedMessage) : console.log(formattedMessage);

        // File output
        this.writeToFile(level, formattedMessage);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    error(message, meta = {}) {
        if (message instanceof Error) {
            meta.stack = message.stack;
            message = message.message;
        }
        this.log('error', message, meta);
    }

    debug(message, meta = {}) {
        if (process.env.NODE_ENV === 'development') {
            this.log('debug', message, meta);
        }
    }
}

module.exports = new Logger();