// src/utils/logger.ts
import winston from 'winston';
import path from 'path';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} ${level}: ${message}\n${stack}`;
        }
        return `${timestamp} ${level}: ${message}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: 'debug',
    format: logFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log')
        }),
        // Separate file for error logs
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error'
        })
    ]
});

// Add stream for Express middleware
interface LoggerStreamInterface {
    write(message: string): void;
}

const loggerStream: LoggerStreamInterface = {
    write: (message: string) => {
        logger.info(message.trim());
    }
};

// Need to use 'as any' to avoid TypeScript errors with morgan integration
(logger as any).stream = loggerStream;

export default logger;