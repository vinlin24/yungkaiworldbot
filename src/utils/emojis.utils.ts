export type CustomEmoji = {
  name: string;
  id: string;
  animated?: boolean;
};

/**
 * Extract custom emojis from a content string.
 */
export function parseCustomEmojis(content: string): Required<CustomEmoji>[] {
  const CUSTOM_EMOJI_REGEXP = /<(a)?:(.+?):(\d+?)>/g;
  const matches = content.matchAll(CUSTOM_EMOJI_REGEXP);
  const emojis: Required<CustomEmoji>[] = [];
  for (const match of matches) {
    const [_, a, name, id] = match;
    const animated = !!a;
    emojis.push({ name, id, animated });
  }
  return emojis;
}

/**
 * Return the custom emoji in "escaped" form (with name and ID, how they are
 * encoded in a content string payload).
 */
export function toEscapedEmoji(emoji: CustomEmoji): string {
  const { name, id, animated = false } = emoji;
  // Animated emojis take the form of <a:NAME:ID>. Non-animated emojis take the
  // form of <:NAME:ID>.
  return `<${animated ? "a" : ""}:${name}:${id}>`;
}

// TODO: Should these only store IDs or full CustomEmoji objects?
/** Partial database of yung kai world's custom emoji IDs. */
export const GUILD_EMOJIS = {
  NEKO_GUN: "1164956284760633364",
  HMM: "1163463196275900547",
  NEKO_L: "1164956350351167540",
  NEKO_UWU: "1164956184277680129",
};
