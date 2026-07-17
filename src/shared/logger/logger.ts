export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  setContext(context: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  private context: Record<string, unknown> = {};
  private readonly level: LogLevel;

  constructor(level: LogLevel = 'INFO') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const base = { timestamp, level, message, ...this.context, ...meta };
    return JSON.stringify(base);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('DEBUG')) {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('INFO')) {
      console.info(this.formatMessage('INFO', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('WARN')) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }
}