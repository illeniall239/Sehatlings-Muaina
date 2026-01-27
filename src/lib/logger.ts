/**
 * Simple structured logger for production
 * Replace with a proper logging service (Axiom, Logtail, etc.) for production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDev = process.env.NODE_ENV !== "production";

  private formatLog(entry: LogEntry): string {
    if (this.isDev) {
      // Pretty print in development
      const emoji = {
        debug: "🔍",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
      }[entry.level];
      
      let output = `${emoji} [${entry.level.toUpperCase()}] ${entry.message}`;
      if (entry.context) {
        output += ` ${JSON.stringify(entry.context)}`;
      }
      if (entry.error) {
        output += `\n${entry.error.stack || entry.error.message}`;
      }
      return output;
    }

    // JSON in production (for log aggregation)
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case "debug":
        if (this.isDev) console.debug(formatted);
        break;
      case "info":
        console.info(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.log("error", message, context, error);
  }
}

export const logger = new Logger();

/**
 * Usage examples:
 * 
 * logger.info("User logged in", { userId: "123", ip: "1.2.3.4" });
 * logger.error("Failed to upload file", error, { fileName: "test.pdf" });
 * logger.warn("Rate limit approaching", { remaining: 5 });
 * logger.debug("Cache hit", { key: "reports:stats:org123" });
 */
