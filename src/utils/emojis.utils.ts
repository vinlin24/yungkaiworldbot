export type CustomEmoji = {
  name: string;
  id: string;
};

export function parseCustomEmojis(content: string): CustomEmoji[] {
  const CUSTOM_EMOJI_REGEXP = /<:(.+?):(\d+?)>/g;
  const matches = content.matchAll(CUSTOM_EMOJI_REGEXP);
  const emojis: CustomEmoji[] = [];
  for (const match of matches) {
    const [_, name, id] = match;
    emojis.push({ name, id });
  }
  return emojis;
}

/** Partial database of yung kai world's custom emoji IDs. */
export const GUILD_EMOJIS = {
  NEKO_GUN: "1164956284760633364",
  HMM: "1163463196275900547",
  NEKO_L: "1164956350351167540",
  NEKO_UWU: "1164956184277680129",
};
