// Also see:
// https://v13.discordjs.guide/miscellaneous/parsing-mention-arguments.html

export function toRoleMention(roleId: string) {
  return `<@&${roleId}>`;
}

export function toUserMention(userId: string) {
  return `<@${userId}>`;
}

export function toChannelMention(channelId: string) {
  return `<#${channelId}>`;
}

// This module can also be expanded to include helpers for parsing mentions,
// creating timestamps, etc.
