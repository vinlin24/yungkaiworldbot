import winston from "winston";

import config from "./config";

const log = winston.createLogger({
  level: config.LOGGER_LEVEL ?? "info",
  format: winston.format.simple(),
  transports: [
    new winston.transports.Console(),
  ],
});

export default log;
