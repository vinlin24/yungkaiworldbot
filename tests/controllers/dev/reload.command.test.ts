import config from "../../../src/config";
import reloadSpec from "../../../src/controllers/dev/reload.command";
import { MockInteraction } from "../../test-utils";

it("should require privilege level >= DEV", async () => {
  const mock = new MockInteraction(reloadSpec).mockCallerRoles(config.KAI_RID);

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).not.toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).not.toHaveBeenCalled();
  expect(mock.client.prepareRuntime).not.toHaveBeenCalled();
  mock.expectRepliedWith({
    // Any mention of the DEV level.
    content: expect.stringMatching(/\bDEV\b/i),
    ephemeral: true,
  });
});

it("should clear defs, deploy commands, and reload defs", async () => {
  const mock = new MockInteraction(reloadSpec)
    .mockCallerRoles(config.BOT_DEV_RID)
    .mockOption("Boolean", "redeploy_slash_commands", true);

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).toHaveBeenCalled();
  expect(mock.client.prepareRuntime).toHaveBeenCalled();
  mock.expectRepliedWith({ ephemeral: true });
});

it("shouldn't deploy commands if option not explicitly set", async () => {
  const mock = new MockInteraction(reloadSpec)
    .mockCallerRoles(config.BOT_DEV_RID);

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).not.toHaveBeenCalled();
  expect(mock.client.prepareRuntime).toHaveBeenCalled();
  mock.expectRepliedWith({ ephemeral: true });
});
