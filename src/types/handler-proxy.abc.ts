import winston from "winston";

import { Contextable, formatContext } from "../utils/logging.utils";

/**
 * Wrapper for some discord.js object to centralize error handling as well as
 * abstract common operations on it.
 */
export abstract class HandlerProxy {
  constructor(
    /** discord.js object to wrap. */
    contextable: Contextable,
    /**
     * Log to use within this handler. This serves to provide more granular
     * control over logging. For example, one can provide a child logger when
     * instantiating the class such that the module name shows up as the
     * consumer of the handler class.
     */
    protected log: winston.Logger,
  ) {
    // @ts-expect-error formatContext() literally has overloads specifically for
    // each type in our union. Unfortunately, we still get ts(2769): "The call
    // would have succeeded against this implementation, but implementation
    // signatures of overloads are not externally visible."
    this.context = formatContext(contextable);
  }

  /**
   * The formatted context string of the object the handler is wrapping. This
   * can be interpolated as a prefix to log statements to provide more
   * descriptive messages. For example:
   *
   *    ```
   *    this.log.info(`${this.context}: your message here.`);
   *    ```
   */
  protected context: string;

  /**
   * Centralized custom error handler.
   */
  protected abstract handleError(error: Error): void;
}
