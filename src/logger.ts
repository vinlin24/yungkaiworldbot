import fs from "node:fs";
import path from "node:path";

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import config from "./config";

/** Path to the directory log files should be written to. */
const LOGS_DIR_PATH = path.join(path.dirname(__dirname), "logs");

/**
 * Path to the log file to use during rapid development. This file will be
 * overwritten every time the program starts up.
 */
const VOLATILE_LOG_PATH = path.join(LOGS_DIR_PATH, "volatile.log");

// Assert that the logs directory exists and the volatile log is deleted.
if (!fs.existsSync(LOGS_DIR_PATH)) {
  fs.mkdirSync(LOGS_DIR_PATH);
}
if (fs.existsSync(VOLATILE_LOG_PATH)) {
  fs.rmSync(VOLATILE_LOG_PATH);
}

/**
 * Don't use colorized formats when writing to files since they may render
 * strangely when opened in editors.
 */
function getLogFormat({ colorized }: { colorized: boolean }) {
  const formats = [
    winston.format.timestamp(),
    winston.format.prettyPrint(),
  ];
  if (colorized) {
    formats.push(winston.format.colorize());
  }
  formats.push(winston.format.printf(info =>
    `[${info.timestamp}] ${info.moduleName} ${info.level}: ${info.message}`,
  ));
  return winston.format.combine(...formats);
}

const transports: winston.transport[] = [];

// Always log to the console.
transports.push(new winston.transports.Console({
  format: getLogFormat({ colorized: true }),
}));

// But also add some form of persistent logging based on runtime environment.
if (config.NODE_ENV === "development") {
  transports.push(new winston.transports.File({
    filename: VOLATILE_LOG_PATH,
    format: getLogFormat({ colorized: false }),
  }));
}
else if (config.NODE_ENV === "production") {
  transports.push(new DailyRotateFile({
    dirname: LOGS_DIR_PATH,
    filename: "production-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxSize: "20m",
    maxFiles: "14d", // Keep logs for 14 days.
    format: getLogFormat({ colorized: false }),
  }));
}

const baseLogger = winston.createLogger({
  levels: winston.config.syslog.levels,
  level: config.LOGGER_LEVEL ?? "info",
  transports,
});

/**
 * Get the child logger for the current module.
 *
 * Usage:
 *
 *    ```
 *    const log = getLogger(__filename);
 *    ```
 */
export default function getLogger(filename: string): winston.Logger {
  const moduleName = path.basename(filename);
  return baseLogger.child({ moduleName });
}
