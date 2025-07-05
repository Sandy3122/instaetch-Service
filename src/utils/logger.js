const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  // In production, default to warn level to reduce noise
  if (env === 'production') {
    return logLevel === 'debug' ? 'debug' : 'warn';
  }
  
  // In development, use LOG_LEVEL env var or default to info
  return logLevel;
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

// Helper function to check if debug logging is enabled
logger.isDebugEnabled = () => logger.level === 'debug';

// Helper function to check if verbose logging should be skipped
logger.shouldSkipVerbose = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' && logger.level !== 'debug';
};

// Utility function to replace console.log with conditional logging
logger.verbose = (message, ...args) => {
  if (!logger.shouldSkipVerbose()) {
    logger.debug(message, ...args);
  }
};

// Utility function for carousel/media scraping logs
logger.media = (message, ...args) => {
  if (logger.level === 'debug' || process.env.LOG_MEDIA === 'true') {
    logger.info(`[MEDIA] ${message}`, ...args);
  }
};

// Utility function for session management logs
logger.session = (message, ...args) => {
  if (logger.level === 'debug' || process.env.LOG_SESSION === 'true') {
    logger.info(`[SESSION] ${message}`, ...args);
  }
};

// Utility function for request interception logs
logger.intercept = (message, ...args) => {
  if (logger.level === 'debug' || process.env.LOG_INTERCEPT === 'true') {
    logger.debug(`[INTERCEPT] ${message}`, ...args);
  }
};

module.exports = logger; 