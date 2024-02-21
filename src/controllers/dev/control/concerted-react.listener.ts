import {
  Events,
  Message,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

import { BOT_DEV_RID, YUNG_KAI_WORLD_GID } from "../../../config";
import getLogger from "../../../logger";
import devControlService from "../../../services/dev-control.service";
import { ListenerBuilder } from "../../../types/listener.types";
import { formatContext } from "../../../utils/logging.utils";

const log = getLogger(__filename);

const concertedReact = new ListenerBuilder(Events.MessageReactionAdd)
  .setId("concerted-react");

concertedReact.filter(() => devControlService.reactWithDev);
concertedReact.filter(isDevThatReacted);
concertedReact.execute(async (reaction, user) => {
  const { message, emoji } = reaction;
  await message.react(emoji);

  const context = formatContext(message as Message);
  log.info(`${context}: concerted reaction ${emoji} with @${user.username}.`);
  return true;
});

/**
 * Check if the reaction is a partial structure, and if so, resolve it such that
 * the message associated with it is in a well-defined stated after this call.
 * Return whether the resolution succeeded.
 *
 * TODO: This checking comes from the discord.js documentation
 * https://discordjs.guide/popular-topics/reactions.html and is likely common to
 * all reaction event listeners, so this may need to be promoted to utils.
 */
async function resolvePartialReaction(
  reaction: MessageReaction | PartialMessageReaction,
  // Would be nice to use something like Promise<reaction is MessageReaction>,
  // but this syntax isn't supported in TypeScript yet.
): Promise<boolean> {
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might
    // result in an API error which should be handled
    try {
      await reaction.fetch();
    }
    catch (error) {
      log.error("something went wrong fetching partial reaction's message.");
      console.error(error);
      // Return as `reaction.message.author` may be undefined/null.
      return false;
    }
  }
  return true;
}

async function isDevThatReacted(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<boolean> {
  if (!await resolvePartialReaction(reaction)) return false;
  reaction = reaction as MessageReaction;
  const context = formatContext(reaction.message as Message);

  const guild = reaction.client.guilds.cache.get(YUNG_KAI_WORLD_GID);
  if (!guild) {
    log.warning(
      `${context}: failed to get cached guild from ID=${YUNG_KAI_WORLD_GID}.`,
    );
    return false;
  }

  const member = guild.members.cache.get(user.id);
  if (!member) {
    log.warning(`${context}: failed to get cached member from ID=${user.id}.`);
    return false;
  }

  const hasBotDevRole = member.roles.cache.has(BOT_DEV_RID);
  return hasBotDevRole;
}

const concertedReactSpec = concertedReact.toSpec();
export default concertedReactSpec;
