import { BABY_MOD_RID } from "../../../src/config";
import shutdownSpec from "../../../src/controllers/dev/shutdown.command";
import { MockInteraction } from "../../test-utils";

describe("/shutdown command", () => {
  let exitSpy: jest.SpyInstance<never, [code?: number]>;
  beforeEach(() => {
    exitSpy = jest.spyOn(process, "exit").mockImplementation();
  });

  it("should fail if privilege NONE (< BABY_MOD)", async () => {
    const mock = new MockInteraction(shutdownSpec);

    await mock.simulateCommand();

    expect(mock.interaction.client.destroy).not.toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("should destroy the client if authorized", async () => {
    const mock = new MockInteraction(shutdownSpec)
      .mockCaller({ roleIds: [BABY_MOD_RID] });

    await mock.simulateCommand();

    expect(mock.interaction.client.destroy).toHaveBeenCalled();
    mock.expectRepliedWith({ content: "🫡" });
  });

  it("should exit the process with success status code", async () => {
    const mock = new MockInteraction(shutdownSpec)
      .mockCaller({ roleIds: [BABY_MOD_RID] });

    await mock.simulateCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
