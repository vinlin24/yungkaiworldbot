import { Events, GuildTextBasedChannel } from "discord.js";

import { ListenerFilter } from "../types/listener.types";
import uids from "../utils/uids.utils";

/**
 * Ignore messages created by bot accounts.
 *
 * NOTE: This includes ALL bot users, not just our client's user. The latter
 * should always be ignored anyway as enforced by the event handler dispatcher.
 */
export const ignoreBots: ListenerFilter<Events.MessageCreate> =
  message => !message.author.bot;

/**
 * Only listen to messages created by a specific user(s) available in our
 * Discord UID mapping.
 */
export function messageFrom(
  ...names: (keyof typeof uids)[]
): ListenerFilter<Events.MessageCreate> {
  return message => names.some(name => message.author.id === uids[name]);
}

/**
 * Only listen to messages created in a channel where pollution is "acceptable".
 * That is, the predicate should fail on "important" channels such as
 * #announcements as well as central hubs like #general.
 */
export const channelPollutionAllowed: ListenerFilter<Events.MessageCreate> =
  message => {
    const channel = message.channel as GuildTextBasedChannel;
    const channelName = channel.name.toLowerCase();

    // Might be best to not annoy the kiddos too much.
    if (channelName.indexOf("general") !== -1)
      return false;

    // Don't pollute important channels.
    const importantSubstrings = ["introductions", "announcements", "welcome"];
    if (importantSubstrings.some(s => channelName.indexOf(s) !== -1))
      return false;

    // TODO: Maybe also somehow ignore "serious" channels (such as forum posts
    // tagged with Mental Health).

    return true;
  };

export function contentMatching(
  pattern: string | RegExp,
): ListenerFilter<Events.MessageCreate> {
  return message => !!message.content.match(pattern);
}
