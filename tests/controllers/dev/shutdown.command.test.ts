import config from "../../../src/config";
import shutdownSpec from "../../../src/controllers/dev/shutdown.command";

import { MockInteraction } from "../../test-utils";

const mock = new MockInteraction(shutdownSpec);

describe("/shutdown command", () => {
  it("should fail if privilege NONE (< BABY_MOD)", async () => {
    await mock.runCommand();
    expect(mock.interaction.client.destroy).not.toHaveBeenCalled();
  });

  it("should destroy the client if authorized", async () => {
    mock.mockCallerRoles(config.BABY_MOD_RID);
    await mock.runCommand();
    expect(mock.interaction.client.destroy).toHaveBeenCalled();
    mock.expectRepliedWith({ content: "🫡" });
  });
});
