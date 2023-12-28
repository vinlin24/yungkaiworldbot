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

/** Partial database of yung kai world's custom emoji names. */
export const GUILD_EMOJIS = {
  NEKO_GUN: "kzNekogun",
  HMM: "hmm",
  NEKO_L: "nekocatL",
  NEKO_UWU: "7482uwucat1",
};
