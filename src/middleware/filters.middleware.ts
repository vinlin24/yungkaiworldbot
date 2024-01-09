import { Events, GuildTextBasedChannel } from "discord.js";

import { ListenerFilterFunction } from "../types/listener.types";
import uids from "../utils/uids.utils";

/**
 * Ignore messages created by bot accounts.
 *
 * NOTE: This includes ALL bot users, not just our client's user. The latter
 * should always be ignored anyway as enforced by the event handler dispatcher.
 */
export const ignoreBots: ListenerFilterFunction<Events.MessageCreate> =
  message => !message.author.bot;

/**
 * Only listen to messages created by a specific user(s) available in our
 * Discord UID mapping.
 */
export function messageFrom(
  ...names: (keyof typeof uids)[]
): ListenerFilterFunction<Events.MessageCreate> {
  return message => names.some(name => message.author.id === uids[name]);
}

/**
 * Return whether this channel is one of the channels that should be immune to
 * "pollution".
 */
export function isPollutionImmuneChannel(
  channel: GuildTextBasedChannel,
): boolean {
  // Might be best to not annoy the kiddos too much.
  if (channel.name.indexOf("general") !== -1)
    return true;

  // Don't pollute important channels.
  const importantSubstrings = ["introductions", "announcements", "welcome"];
  if (importantSubstrings.some(s => channel.name.indexOf(s) !== -1))
    return true;

  // TODO: Maybe also somehow ignore "serious" channels (such as forum posts
  // tagged with Mental Health).

  return false;
}


/**
 * Only listen to messages created in a channel where pollution is "acceptable".
 * That is, the predicate should fail on "important" channels such as
 * #announcements as well as central hubs like #general.
 */
export const channelPollutionAllowed
  : ListenerFilterFunction<Events.MessageCreate>
  = message => !isPollutionImmuneChannel(message.channel as GuildTextBasedChannel);

export function contentMatching(
  pattern: string | RegExp,
): ListenerFilterFunction<Events.MessageCreate> {
  return message => !!message.content.match(pattern);
}

/**
 * Same as `channelPollutionAllowed`, but taking in arguments and then returning
 * the closure that can be passed into a builder filter. The arguments are user
 * IDs of users that can bypass the channel pollution prevention policy.
 */
export function channelPollutionAllowedOrBypass(
  // TODO: `| undefined` to accommodate undefined UIDs for now.
  ...bypasserUids: (string | undefined)[]
): ListenerFilterFunction<Events.MessageCreate> {
  return function (message) {
    const channel = message.channel as GuildTextBasedChannel
    const pollutionAllowed = !isPollutionImmuneChannel(channel);
    // TODO: filtering out undefined to accommodate undefined UIDs for now.
    const canBypass = bypasserUids.filter(Boolean).includes(message.author.id);
    return pollutionAllowed || canBypass;
  };
}

export function randomly(
  successChance: number,
): ListenerFilterFunction<Events.MessageCreate> {
  if (successChance < 0 || successChance > 1) {
    throw new Error(
      `successChance must be in range [0, 1] but received ${successChance}`
    );
  }
  return _ => Math.random() < successChance;
}
