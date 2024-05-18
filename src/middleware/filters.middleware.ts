import { Awaitable, Events, GuildTextBasedChannel } from "discord.js";
import { clamp } from "lodash";

import { ListenerFilterFunction } from "../types/listener.types";
import { TIME_UNITS } from "../utils/dates.utils";
import { parseCustomEmojis } from "../utils/emojis.utils";

/**
 * Abbreviation for `ListenerFilterFunction<Events.MessageCreate>`.
 */
export type MessageFilterFunction
  = ListenerFilterFunction<Events.MessageCreate>;

/**
 * Ignore messages created by bot accounts.
 *
 * NOTE: This includes ALL bot users, not just our client's user. The latter
 * should always be ignored anyway as enforced by the event handler dispatcher.
 */
export const ignoreBots: MessageFilterFunction = message => !message.author.bot;

/**
 * Only listen to messages created by a specific user(s), specified by user
 * ID(s).
 */
export function messageFrom(...userIds: string[]): MessageFilterFunction {
  return message => userIds.some(uid => message.author.id === uid);
}

/**
 * Return whether this channel is one of the channels that should be immune to
 * "pollution".
 */
export function isPollutionImmuneChannel(
  channel: GuildTextBasedChannel,
): boolean {
  // Might be best to not annoy the kiddos too much.
  if (channel.name.indexOf("general") !== -1) return true;

  // Don't pollute important channels.
  const importantSubstrings = ["introductions", "announcements", "welcome"];
  if (importantSubstrings.some(s => channel.name.indexOf(s) !== -1)) {
    return true;
  }

  // TODO: Maybe also somehow ignore "serious" channels (such as forum posts
  // tagged with Mental Health).

  return false;
}

/**
 * Only listen to messages created in a channel where pollution is "acceptable".
 * That is, the predicate should fail on "important" channels such as
 * #announcements as well as central hubs like #general.
 */
export const channelPollutionAllowed: MessageFilterFunction
  = message =>
    !isPollutionImmuneChannel(message.channel as GuildTextBasedChannel);

export function contentMatching(
  pattern: string | RegExp,
): MessageFilterFunction {
  return message => !!message.content.match(pattern);
}

/**
 * Same as `channelPollutionAllowed`, but taking in arguments and then returning
 * the closure that can be passed into a builder filter. The arguments are user
 * IDs of users that can bypass the channel pollution prevention policy.
 */
export function channelPollutionAllowedOrBypass(
  ...bypasserUids: string[]
): MessageFilterFunction {
  return function (message) {
    const channel = message.channel as GuildTextBasedChannel;
    const pollutionAllowed = !isPollutionImmuneChannel(channel);
    const canBypass = bypasserUids.includes(message.author.id);
    return pollutionAllowed || canBypass;
  };
}

/**
 * A filter that passes by random chance. The chance parameter can either be a
 * constant probability (in the range [0, 1]) or a callback that resolves to a
 * probability (for dynamic, real-time computation).
 */
export function randomly(successChance:
  | number
  | (() => Awaitable<number>),
): MessageFilterFunction {
  // Normalize argument to a callback.
  const getSuccessChance = typeof successChance === "function"
    ? successChance
    : () => successChance;

  return async function () {
    let chance = await getSuccessChance();
    chance = clamp(chance, 0, 1);
    return Math.random() < chance;
  };
}

/**
 * Return a filter that checks for whether the message content contains the
 * specified custom emoji.
 */
export function containsCustomEmoji(emojiId: string): MessageFilterFunction {
  return function (message) {
    const emojis = parseCustomEmojis(message.content);
    return emojis.some(e => e.id === emojiId);
  };
}

/**
 * Return a filter that checks for whether the message content contains the
 * specified Unicode emoji.
 */
export function containsEmoji(unicodeEmoji: string): MessageFilterFunction {
  return function (message) {
    return message.content.includes(unicodeEmoji);
  };
}

/**
 * Return a filter that checks for whether the message is from a channel that is
 * one of the ones specified with CIDs.
 */
export function inChannel(...cids: string[]): MessageFilterFunction {
  return function (message) {
    return cids.includes(message.channelId);
  };
}

/**
 * Return a filter that checks for whether the message is from a user that has
 * been in the server for at least the specified amount of time.
 */
export function authorHasBeenMemberFor(
  numUnits: number,
  unitType: keyof typeof TIME_UNITS,
): MessageFilterFunction {
  return function (message) {
    const { member } = message;
    if (!member) return false;

    const { joinedTimestamp } = member;
    if (joinedTimestamp === null) return false;

    const conversionFactor = TIME_UNITS[unitType];
    const numSecondsTimeDelta = numUnits * conversionFactor;

    const nowSeconds = Math.floor(Date.now() / 1000);
    const joinedAtSeconds = Math.floor(joinedTimestamp / 1000);

    return nowSeconds - joinedAtSeconds >= numSecondsTimeDelta;
  };
}
