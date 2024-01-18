// Also see:
// https://v13.discordjs.guide/miscellaneous/parsing-mention-arguments.html

import { toUnixSeconds } from "./dates.utils";

/**
 * @deprecated discord.js already provides this utility via `roleMention()`.
 */
export function toRoleMention(roleId: string): string {
  return `<@&${roleId}>`;
}

/**
 * @deprecated discord.js already provides this utility via `userMention()`.
 */
export function toUserMention(userId: string): string {
  return `<@${userId}>`;
}

/**
 * @deprecated discord.js already provides this utility via `channelMention()`.
 */
export function toChannelMention(channelId: string): string {
  return `<#${channelId}>`;
}

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
  return Array.from(userIds).map(toUserMention).join(", ");
}

/**
 * See: https://gist.github.com/LeviSnoot/d9147767abeef2f770e9ddcd91eb85aa.
 */
export enum TimestampFormat {
  /** 12-hour Example: 9:01 AM */
  SHORT_TIME = "t",
  /** 12-hour Example: 9:01:00 AM */
  LONG_TIME = "T",
  /** 12-hour Example: 11/28/2018 */
  SHORT_DATE = "d",
  /** 12-hour Example: November 28, 2018 */
  LONG_DATE = "D",
  /** 12-hour Example: November 28, 2018 9:01 AM */
  SHORT_DATETIME = "f",
  /** 12-hour Example: Wednesday, November 28, 2018 9:01 AM */
  LONG_DATETIME = "F",
  /** 12-hour Example: 3 years ago */
  RELATIVE = "R",
}

export function toTimestampMention(
  date: Date,
  format?: TimestampFormat,
): string {
  const unixTimestamp = toUnixSeconds(date);
  let result = `<t:${unixTimestamp}`;
  if (format) {
    result += `:${format}`;
  }
  result += ">";
  return result;
}

export function toRelativeTimestampMention(date: Date): string {
  // I assume this format is among the most common ones besides the default one,
  // so it's nice to have a shorthand function partial.
  return toTimestampMention(date, TimestampFormat.RELATIVE);
}

export function toBulletedList(lines: string[], level: number = 0): string {
  const indent = "  ".repeat(level);
  return lines.map(line => `${indent}* ${line}`).join("\n");
}
