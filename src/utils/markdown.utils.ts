// Also see:
// https://v13.discordjs.guide/miscellaneous/parsing-mention-arguments.html

import {
  TimestampStyles,
  TimestampStylesString,
  userMention,
} from "discord.js";

import { toUnixSeconds } from "./dates.utils";

export type Mentionable = {
  type: "user";
  uid: string;
} | {
  type: "role";
  rid: string;
} | {
  type: "channel";
  cid: string;
};

export function parseMention(mention: string): Mentionable | null {
  function isIntegerString(s: string): boolean {
    // Edge case: Number("") == 0, so don't let that case fall through.
    if (!s) return false;
    const num = Number(s);
    return Number.isInteger(num);
  }

  if (!mention.endsWith(">")) return null;

  if (mention.startsWith("<#")) {
    const cid = mention.slice(2, -1);
    if (!isIntegerString(cid)) return null;
    return { type: "channel", cid };
  }

  if (mention.startsWith("<@&")) {
    const rid = mention.slice(3, -1);
    if (!isIntegerString(rid)) return null;
    return { type: "role", rid };
  }

  if (mention.startsWith("<@")) {
    let uid = mention.slice(2, -1);
    // If the user has a nickname, the mention looks like <@!UID>.
    if (uid.startsWith("!")) {
      uid = uid.slice(1);
    }
    if (!isIntegerString(uid)) return null;
    return { type: "user", uid };
  }

  return null;
}

export function joinUserMentions(userIds?: Iterable<string>): string {
  if (!userIds) return "";
  return Array.from(userIds).map(userMention).join(", ");
}

export type TimestampMention<F extends TimestampStylesString | null = null>
  = F extends null ? `<t:${number}>` : `<t:${number}:${F}>`;

export function toTimestampMention(date: Date): `<t:${number}>`;
export function toTimestampMention<F extends TimestampStylesString>(
  date: Date,
  format: F,
): TimestampMention<F>;
export function toTimestampMention(
  date: Date,
  format?: TimestampStylesString,
): TimestampMention<any> {
  const unixTimestamp = toUnixSeconds(date);
  if (format) {
    return `<t:${unixTimestamp}:${format}>`;
  }
  return `<t:${unixTimestamp}>`;
}

export function toRelativeTimestampMention(date: Date): TimestampMention<"R"> {
  // I assume this format is among the most common ones besides the default one,
  // so it's nice to have a shorthand function partial.
  return toTimestampMention(date, TimestampStyles.RelativeTime);
}

export function toBulletedList(lines: string[], level: number = 0): string {
  const indent = "  ".repeat(level);
  return lines.map(line => `${indent}* ${line}`).join("\n");
}
