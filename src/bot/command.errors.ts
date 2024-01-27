import { InteractionReplyOptions } from "discord.js";

import { DiscordAPIErrorWithCode } from "../types/errors.types";

/**
 * Type for functions returning the options to use when replying to/following up
 * with the interaction upon a specific type of command error.
 *
 * If the `Opcode` type parameter is left as `null`, the error argument is left
 * as a general `Error` type. Otherwise, the `Opcode` specifies the type of
 * Discord API error.
 */
export type ErrorReplyGetter<Opcode extends number | null = null>
  = (error?: Opcode extends number ? DiscordAPIErrorWithCode<Opcode> : Error)
    => Omit<InteractionReplyOptions, "ephemeral">;

export const getReplyForUnknownError: ErrorReplyGetter = () => {
  return {
    content: "There was an error while executing this command!",
  };
};

export const getReplyForMissingPermissions: ErrorReplyGetter<50013> = () => {
  return {
    content: "I'm not allowed to perform this action!",
  };
};
