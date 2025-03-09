jest.mock("../../../src/utils/meta.utils");

import { EmbedBuilder } from "discord.js";
import { Matcher } from "jest-mock-extended";

import { KAI_RID } from "../../../src/config";
import reloadSpec from "../../../src/controllers/dev/reload.command";
import { getCurrentBranchName } from "../../../src/utils/meta.utils";
import { MockInteraction } from "../../test-utils";

const mockedGetCurrentBranchName = jest.mocked(getCurrentBranchName);

let mock: MockInteraction;

beforeEach(() => {
  mock = new MockInteraction(reloadSpec);

  // Need to explicitly specify a return value (otherwise the falsy undefined
  // is used at runtime).
  mock.client.prepareRuntime.mockResolvedValue(true);
});

it("should require privilege level >= DEV", async () => {
  mock.mockCaller({ roleIds: [KAI_RID] });

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).not.toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).not.toHaveBeenCalled();
  expect(mock.client.prepareRuntime).not.toHaveBeenCalled();
  expect(mock.client.emit).not.toHaveBeenCalled();
  mock.expectRepliedWith({
    // Any mention of the DEV level.
    content: expect.stringMatching(/\bDEV\b/i),
    ephemeral: true,
  });
});

it("should clear defs, deploy commands, and reload defs", async () => {
  mock
    .mockCallerIsDev()
    .mockOption("Boolean", "redeploy_slash_commands", true);

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).toHaveBeenCalled();
  expect(mock.client.prepareRuntime).toHaveBeenCalled();
  expect(mock.client.emit).toHaveBeenCalled();
  mock.expectRepliedWith({ ephemeral: true });
});

it("shouldn't deploy commands if option not explicitly set", async () => {
  mock.mockCallerIsDev();

  await mock.simulateCommand();

  expect(mock.client.clearDefinitions).toHaveBeenCalled();
  expect(mock.client.deploySlashCommands).not.toHaveBeenCalled();
  expect(mock.client.prepareRuntime).toHaveBeenCalled();
  expect(mock.client.emit).toHaveBeenCalled();
  mock.expectRepliedWith({ ephemeral: true });
});

it("should update the client's branch name", async () => {
  mock.mockCallerIsDev();
  mockedGetCurrentBranchName.mockReturnValueOnce("DUMMY-BRANCH-NAME");

  await mock.simulateCommand();

  expect(mock.client.branchName).toEqual("DUMMY-BRANCH-NAME");
});

describe("stealth mode setting", () => {
  beforeEach(() => {
    mock.mockCallerIsDev();
  });

  it("should reload with stealth mode enabled", async () => {
    mock.mockOption("Boolean", "stealth_mode", true);
    mock.client.stealth = false;

    await mock.simulateCommand();

    expect(mock.client.stealth).toEqual(true);
  });

  it("should reload with stealth mode disabled", async () => {
    mock.mockOption("Boolean", "stealth_mode", false);
    mock.client.stealth = true;

    await mock.simulateCommand();

    expect(mock.client.stealth).toEqual(false);
  });

  it("should preserve the stealth mode setting if omitted", async () => {
    mock.client.stealth = true;

    await mock.simulateCommand();

    expect(mock.client.stealth).toEqual(true);
  });
});

describe("error handling", () => {
  beforeEach(() => {
    mock
      .mockCallerIsDev()
      .mockOption("Boolean", "redeploy_slash_commands", true);

    // Also suppress console.error output.
    jest.spyOn(console, "error").mockImplementation(() => { });
  });

  const dummyError = new Error("This is a description of the dummy error.");
  const embedErrorMatcher = new Matcher<EmbedBuilder>(value => {
    const mentionsError = !!value.data.title?.includes(dummyError.name);
    const containsDescription = value.data.description === dummyError.message;
    return mentionsError && containsDescription;
  }, "embed error matcher");

  const methodsToMockErrors = [
    "clearDefinitions",
    "deploySlashCommands",
    "prepareRuntime",
  ] as const;

  for (const [index, methodName] of methodsToMockErrors.entries()) {
    it(`should handle errors in ${methodName}`, async () => {
      mock.client[methodName].mockRejectedValueOnce(dummyError);

      await mock.simulateCommand();

      expect(mock.client[methodName]).toHaveBeenCalled(); // Or else pointless.
      mock.expectRepliedWith({
        embeds: expect.arrayContaining([embedErrorMatcher]),
        ephemeral: true,
      });
    });

    it(`should short-circuit if ${methodName} errors`, async () => {
      mock.client[methodName].mockRejectedValueOnce(dummyError);

      await mock.simulateCommand();

      expect(mock.client[methodName]).toHaveBeenCalled(); // Or else pointless.
      for (let j = index + 1; j < methodsToMockErrors.length; j++) {
        const skippedMethodName = methodsToMockErrors[j];
        expect(mock.client[skippedMethodName]).not.toHaveBeenCalled();
      }
    });
  }

  it("should treat false from prepareRuntime as a failure", async () => {
    mock.client.prepareRuntime.mockResolvedValueOnce(false);

    await mock.simulateCommand();

    expect(mock.client.prepareRuntime).toHaveBeenCalled(); // Or else pointless.
    mock.expectRepliedWith({
      // A custom error is raised internally.
      embeds: expect.arrayContaining([expect.any(EmbedBuilder)]),
      ephemeral: true,
    });
  });
});
