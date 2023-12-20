import { Awaitable, ClientEvents } from "discord.js";

// NOTE: This type parameter magic is to imitate what's done in
// discord.js/typings/index.ts to make Client.once and Client.on work with our
// custom EventSpec type.
export type EventSpec<EventName extends keyof ClientEvents> = {
  name: EventName;
  once?: boolean;
  execute: (...args: ClientEvents[EventName]) => Awaitable<any>;
};
