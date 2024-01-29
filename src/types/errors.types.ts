import { DiscordAPIError } from "discord.js";

/**
 * Utility type for narrowing discord.js' `DiscordAPIError` to have the literal
 * opcode for the `code` property.
 *
 * See: https://discord.com/developers/docs/topics/opcodes-and-status-codes
 */
export type DiscordAPIErrorWithCode<Opcode extends number>
  = DiscordAPIError & { code: Opcode };

export function isCannotSendToThisUser(error: unknown):
  error is DiscordAPIErrorWithCode<50007> {
  return error instanceof DiscordAPIError && error.code === 50007;
}

export function isMissingPermissions(error: unknown):
  error is DiscordAPIErrorWithCode<50013> {
  return error instanceof DiscordAPIError && error.code === 50013;
}

export function isReactionBlocked(error: unknown):
  error is DiscordAPIErrorWithCode<90001> {
  return error instanceof DiscordAPIError && error.code === 90001;
}
