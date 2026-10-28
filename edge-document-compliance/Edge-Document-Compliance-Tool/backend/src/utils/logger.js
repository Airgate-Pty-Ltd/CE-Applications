/**
 * Logger Utility for VERA + Mistral Integration
 * Provides color-coded, timestamped logging with configurable log levels
 * Uses native Node.js only - no external dependencies
 */

class Logger {
  constructor(moduleName = 'APP') {
    this.moduleName = moduleName.toUpperCase();
    this.logLevel = process.env.LOG_LEVEL || 'info';
    
    // Define log levels (lower number = higher priority)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Check if a log level should be output
   * @param {string} level - The log level to check
   * @returns {boolean} - True if should log, false otherwise
   */
  shouldLog(level) {
    const currentLevel = this.levels[this.logLevel] ?? this.levels.info;
    const messageLevel = this.levels[level] ?? this.levels.info;
    return messageLevel <= currentLevel;
  }

  /**
   * Format timestamp for log messages
   * @returns {string} - Formatted timestamp
   */
  getTimestamp() {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * Format log message with timestamp and module name
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Optional data to include
   * @returns {string} - Formatted log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const prefix = `[${timestamp}] [${this.moduleName}] [${level.toUpperCase()}]`;
    
    if (data !== null && data !== undefined) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
        return `${prefix} ${message}\n${dataStr}`;
      } catch (error) {
        return `${prefix} ${message}\n[Data serialization error: ${error.message}]`;
      }
    }
    
    return `${prefix} ${message}`;
  }

  /**
   * Get ANSI color code for log level
   * @param {string} level - Log level
   * @returns {string} - ANSI color code
   */
  getColor(level) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    return colors[level] || '\x1b[0m'; // Default to reset
  }

  /**
   * Reset ANSI color code
   */
  getResetColor() {
    return '\x1b[0m';
  }

  /**
   * Log error message (highest priority)
   * @param {string} message - Error message
   * @param {any} error - Optional error object or data
   */
  error(message, error = null) {
    if (!this.shouldLog('error')) return;
    
    const color = this.getColor('error');
    const reset = this.getResetColor();
    const formatted = this.formatMessage('error', message, error);
    
    console.error(`${color}${formatted}${reset}`);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Optional data
   */
  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const color = this.getColor('warn');
    const reset = this.getResetColor();
    const formatted = this.formatMessage('warn', message, data);
    
    console.warn(`${color}${formatted}${reset}`);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Optional data
   */
  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const color = this.getColor('info');
    const reset = this.getResetColor();
    const formatted = this.formatMessage('info', message, data);
    
    console.log(`${color}${formatted}${reset}`);
  }

  /**
   * Log debug message (lowest priority)
   * @param {string} message - Debug message
   * @param {any} data - Optional data
   */
  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const color = this.getColor('debug');
    const reset = this.getResetColor();
    const formatted = this.formatMessage('debug', message, data);
    
    console.log(`${color}${formatted}${reset}`);
  }
}

/**
 * Create a logger instance for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {Logger} - Logger instance
 */
export function createLogger(moduleName) {
  return new Logger(moduleName);
}

/**
 * Default logger instance
 */
export default new Logger('VERA');
