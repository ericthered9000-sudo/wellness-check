/**
 * Structured Logger
 * Prevents PII leakage in production logs
 * Usage: logger.info('message', data)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LogLevelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class Logger {
  private level: LogLevel;
  private service: string;

  constructor(service: string = 'wellness-backend', level?: LogLevel) {
    this.service = service;
    this.level = level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${this.service}] [${level.toUpperCase()}] ${message}`;
    
    // Don't log data for error level in production to avoid PII
    if (data !== undefined) {
      if (level === 'error' && process.env.NODE_ENV === 'production') {
        return `${base} - ${data instanceof Error ? data.message : String(data)}`;
      }
      return `${base} ${JSON.stringify(data)}`;
    }
    
    return base;
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (LogLevelOrder[level] >= LogLevelOrder[this.level]) {
      const formatted = this.formatMessage(level, message, data);
      
      switch (level) {
        case 'error':
          console.error(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        default:
          console.log(formatted);
      }
    }
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: any): void {
    // Only log error message, not full stack trace or data in production
    const safeError = error instanceof Error ? { message: error.message, code: (error as any).code } : error;
    this.log('error', message, safeError);
  }
}

// Create default logger instance
export const logger = new Logger();

// Export for custom service loggers
export { Logger };
