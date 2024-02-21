import {
  Guild,
  GuildMember,
  MessageReaction,
  ReactionEmoji,
  User,
} from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { ListenerRunner } from "../../../../src/bot/listener.runner";
import { BOT_DEV_RID, YUNG_KAI_WORLD_GID } from "../../../../src/config";
import concertedReactSpec from "../../../../src/controllers/dev/control/concerted-react.listener";
import devControlService from "../../../../src/services/dev-control.service";
import { addMockGetter } from "../../../test-utils";

let mockReaction: DeepMockProxy<MessageReaction>;
let mockUser: DeepMockProxy<User>;
beforeEach(() => {
  mockReaction = mockDeep<MessageReaction>();
  mockUser = mockDeep<User>();
});

/**
 * ARRANGE.
 *
 * Arrange the mock reaction and mock user to emit (the objects passed to the
 * `MessageReactionAdd` event listener pipeline).
 */
function arrangeEmission(options: {
  enabled: boolean,
  reacterIsDev?: boolean,
  emoji?: string,
}): void {
  // Mock service state.
  jest.replaceProperty(devControlService, "reactWithDev", options.enabled);

  // Mock emoji getting.
  const mockEmoji = mockDeep<ReactionEmoji>();
  addMockGetter(mockEmoji, "identifier", options.emoji ?? "❤️");
  addMockGetter(mockReaction, "emoji", mockEmoji);

  // Mock ID of reacter.
  const mockReacterId = "1234";
  mockUser.id = mockReacterId;

  // MOCKING THE REACTION
  // --------------------
  // To check if it was a dev that reacted, we need to interrogate the
  // reaction's guild -> getting the member from user in that guild -> checking
  // that member's roles.

  // (1) Mock guild getting.
  const mockGuild = mockDeep<Guild>();
  mockReaction.client.guilds.cache.get
    .calledWith(YUNG_KAI_WORLD_GID)
    .mockReturnValue(mockGuild);

  // (2) Mock member getting.
  mockGuild.members.cache.get.mockImplementation(key => {
    if (key !== mockReacterId) return undefined;

    const mockMember = mockDeep<GuildMember>();
    addMockGetter(mockMember, "id", key);
    mockMember.user.id = key;

    // (3) Mock role getting.
    mockMember.roles.cache.has
      .calledWith(BOT_DEV_RID)
      .mockReturnValue(!!options.reacterIsDev);

    return mockMember;
  });
}

/**
 * ACT.
 *
 * Simulate the emission of the `MessageReactionAdd` event using the prepared
 * objects.
 */
async function simulateEmission(): Promise<void> {
  const runner = new ListenerRunner(concertedReactSpec);
  await runner.callbackToRegister(mockReaction, mockUser);
}

/**
 * ASSERT.
 *
 * Check that the reaction was or wasn't copied.
 */
function assertReacted(reacted: boolean): void {
  if (reacted) {
    expect(mockReaction.message.react).toHaveBeenCalledWith(mockReaction.emoji);
  }
  else {
    expect(mockReaction.message.react).not.toHaveBeenCalled();
  }
}

it("should copy the dev's reaction if service is enabled", async () => {
  arrangeEmission({ enabled: true, reacterIsDev: true });
  await simulateEmission();
  assertReacted(true);
});

it("should not copy reaction is reacter is not a dev", async () => {
  arrangeEmission({ enabled: true, reacterIsDev: false });
  await simulateEmission();
  assertReacted(false);
});

it("should not copy reaction if service is disabled", async () => {
  arrangeEmission({ enabled: false, reacterIsDev: true });
  await simulateEmission();
  assertReacted(false);
});
