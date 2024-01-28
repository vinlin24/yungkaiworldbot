import { BABY_MOD_RID } from "../../../src/config";
import shutdownSpec from "../../../src/controllers/dev/shutdown.command";

import { MockInteraction } from "../../test-utils";

describe("/shutdown command", () => {
  it("should fail if privilege NONE (< BABY_MOD)", async () => {
    const mock = new MockInteraction(shutdownSpec);
    await mock.simulateCommand();
    expect(mock.interaction.client.destroy).not.toHaveBeenCalled();
  });

  it("should destroy the client if authorized", async () => {
    const mock = new MockInteraction(shutdownSpec);
    mock.mockCallerRoles(BABY_MOD_RID);
    await mock.simulateCommand();
    expect(mock.interaction.client.destroy).toHaveBeenCalled();
    mock.expectRepliedWith({ content: "🫡" });
  });
});
