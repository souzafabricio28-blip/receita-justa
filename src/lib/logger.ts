type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function createLog(level: LogLevel) {
  return (message: string, context?: Record<string, unknown>) => {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId as string | undefined,
    };

    const formatted = formatLog(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "debug":
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  };
}

export const logger = {
  info: createLog("info"),
  warn: createLog("warn"),
  error: createLog("error"),
  debug: createLog("debug"),
};
