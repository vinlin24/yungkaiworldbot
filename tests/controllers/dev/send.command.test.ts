import { GuildTextBasedChannel } from "discord.js";
import config from "../../../src/config";
import devSendSpec from "../../../src/controllers/dev/send.command";
import { RoleLevel } from "../../../src/middleware/privilege.middleware";
import { MockInteraction } from "../../test-utils";

let mock: MockInteraction;
beforeEach(() => { mock = new MockInteraction(devSendSpec); });

it("should require privilege level >= DEV", async () => {
  mock
    .mockCaller({ roleIds: [config.KAI_RID] })
    .mockOption("String", "content", "please let me use this");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).not.toHaveBeenCalled();
  mock.expectMentionedMissingPrivilege(RoleLevel.DEV);
});

it("should forward content to current channel", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "hello there");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.objectContaining({ content: "hello there" }),
  );
  mock.expectRepliedGenericACK();
});

it("should forward content to specified channel", async () => {
  const mockChannel = { send: jest.fn() } as unknown as GuildTextBasedChannel;
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "general kenobi")
    .mockOption<GuildTextBasedChannel>("Channel", "channel", mockChannel);
  await mock.simulateCommand();
  expect(mockChannel.send).toHaveBeenCalledWith(
    expect.objectContaining({ content: "general kenobi" }),
  );
  mock.expectRepliedGenericACK();
});

it("should disable mentions by default", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "you are a bold one");
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.objectContaining({
      allowedMentions: expect.objectContaining({ parse: [] }),
    }),
  );
  mock.expectRepliedGenericACK();
});

it("should enable mentions if explicitly specified", async () => {
  mock
    .mockCaller({ roleIds: [config.BOT_DEV_RID] })
    .mockOption("String", "content", "you're shorter than i expected")
    .mockOption("Boolean", "enable_mentions", true);
  await mock.simulateCommand();
  expect(mock.interaction.channel!.send).toHaveBeenCalledWith(
    expect.not.objectContaining({
      allowedMentions: expect.anything(),
    }),
  );
  mock.expectRepliedGenericACK();
});
