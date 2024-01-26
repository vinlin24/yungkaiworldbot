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
): DeepMockProxy<Message<true>> {
  const mockMessage = mockDeep<Message<true>>();
  mock.interaction.channel!.messages.fetch
    .mockResolvedValueOnce(new Collection([["DUMMY-ID", mockMessage]]));
  return mockMessage;
}
