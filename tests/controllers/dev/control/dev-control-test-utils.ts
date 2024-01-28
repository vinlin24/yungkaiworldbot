import { Collection, Message, Snowflake } from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { MockInteraction } from "../../../test-utils";

export function mockChannelFetchMessageById(
  mock: MockInteraction,
  dummyMessageId: string,
): DeepMockProxy<Message<true>> {
  const mockMessage = mockDeep<Message<true>>();
  // @ts-expect-error Choose Message overload over Collection return type.
  mock.interaction.channel!.messages.fetch.mockImplementationOnce(id => {
    if (id as Snowflake === dummyMessageId) {
      return Promise.resolve(mockMessage);
    }
    throw new Error("unrecognized dummy message ID");
  });
  return mockMessage;
}

export function mockChannelFetchMessage(
  mock: MockInteraction,
  nthMostRecent: number = 1,
): DeepMockProxy<Message<true>> {
  // mockMessages is in ascending order of timestamp.
  const mockMessages = Array.from({ length: nthMostRecent }).map((_, i) => {
    const message = mockDeep<Message<true>>();
    message.createdTimestamp = new Date(i * 1000).getTime();
    return message;
  });

  const asIdMessagePairs = mockMessages
    .map((message, i) => [`DUMMY-ID-${i}`, message] as const);
  const asCollection = new Collection(asIdMessagePairs);
  mock.interaction.channel!.messages.fetch.mockResolvedValueOnce(asCollection);

  const mockMessage = mockMessages[0];
  return mockMessage;
}
