jest.mock("../../src/utils/logging.utils");
jest.mock("../../src/types/errors.types");

import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import * as commandErrors from "../../src/bot/command.errors";
import { CommandRunner } from "../../src/bot/command.runner";
import { CommandCheck, CommandSpec } from "../../src/types/command.types";
import { isMissingPermissions } from "../../src/types/errors.types";
import { suppressConsoleError } from "../test-utils";

function getCommandInteraction(options?: {
  replied?: boolean,
  deferred?: boolean,
}): DeepMockProxy<ChatInputCommandInteraction> {
  const interaction = mockDeep<ChatInputCommandInteraction>();
  interaction.replied = !!options?.replied;
  interaction.deferred = !!options?.deferred;
  return interaction;
}

const dummyError = new Error("DUMMY-ERROR");

beforeEach(suppressConsoleError);

describe("run", () => {
  const spec: CommandSpec = {
    definition: {} as RESTPostAPIChatInputApplicationCommandsJSONBody,
    execute: jest.fn(),
  };

  let runner: CommandRunner;
  beforeEach(() => runner = new CommandRunner(spec));

  it("should run the execute callback", async () => {
    const interaction = getCommandInteraction();

    await runner.run(interaction);

    expect(spec.execute).toHaveBeenCalledWith(interaction);
  });

  it("should gracefully handle error in generic fallback reply", async () => {
    const interaction = getCommandInteraction();
    jest.mocked(interaction.reply).mockRejectedValueOnce(dummyError);

    expect(async () => await runner.run(interaction)).not.toThrow();
  });

  describe("checks", () => {
    const checks: CommandCheck[] = [
      {
        predicate: jest.fn(),
        onFail: jest.fn(),
        afterExecute: jest.fn(),
      },
      {
        predicate: jest.fn(),
        onFail: jest.fn(),
        afterExecute: jest.fn(),
      },
      {
        predicate: jest.fn(),
        onFail: jest.fn(),
        afterExecute: jest.fn(),
      },
    ] as const;
    const predicates = checks.map(check => check.predicate);
    const posthooks = checks.map(check => check.afterExecute);

    const specWithChecks: CommandSpec = {
      definition: {} as RESTPostAPIChatInputApplicationCommandsJSONBody,
      execute: jest.fn(),
      checks,
    };

    let runnerWithChecks: CommandRunner;
    let interaction: ChatInputCommandInteraction;
    let errorHandlerSpy: jest.SpyInstance;
    beforeEach(() => {
      runnerWithChecks = new CommandRunner(specWithChecks);
      interaction = getCommandInteraction();
      errorHandlerSpy = jest.spyOn(
        CommandRunner.prototype as any, // Access protected method.
        "handleCommandError",
      );
      // Default to predicates returning true (passing).
      for (const check of checks) {
        jest.mocked(check.predicate).mockResolvedValue(true);
      }
    });

    it("should run all checks", async () => {
      await runnerWithChecks.run(interaction);

      for (const predicate of predicates) {
        expect(predicate).toHaveBeenCalledWith(interaction);
        expect(predicate).toHaveReturnedWith(Promise.resolve(true));
      }
    });

    describe("check failure", () => {
      it("should short-circuit on first check failure", async () => {
        jest.mocked(checks[1].predicate).mockResolvedValueOnce(false);

        await runnerWithChecks.run(interaction);

        expect(checks[2].predicate).not.toHaveBeenCalled();
      });

      it("should run fail handler on check failure", async () => {
        jest.mocked(checks[0].predicate).mockResolvedValueOnce(false);

        await runnerWithChecks.run(interaction);

        expect(checks[0].onFail).toHaveBeenCalledWith(interaction);
      });

      it("should treat predicate errors as failures", async () => {
        jest.mocked(checks[1].predicate).mockRejectedValueOnce(dummyError);

        await runnerWithChecks.run(interaction);

        expect(checks[2].predicate).not.toHaveBeenCalled();
        expect(errorHandlerSpy).toHaveBeenCalledWith(interaction, dummyError);
      });

      it("should gracefully handle errors in onFail handler", async () => {
        jest.mocked(checks[0].predicate).mockResolvedValueOnce(false);
        jest.mocked(checks[0].onFail!).mockRejectedValueOnce(dummyError);

        await runnerWithChecks.run(interaction);

        expect(errorHandlerSpy).toHaveBeenCalledWith(interaction, dummyError);
      });
    });

    describe("check cleanup", () => {
      it("should run all cleanup hooks after successful execute", async () => {
        await runnerWithChecks.run(interaction);

        for (const posthook of posthooks) {
          expect(posthook).toHaveBeenCalledWith(interaction);
        }
      });

      it("should not run any cleanup hooks if execute fails", async () => {
        jest.mocked(specWithChecks.execute).mockResolvedValueOnce(false);

        await runnerWithChecks.run(interaction);

        for (const posthook of posthooks) {
          expect(posthook).not.toHaveBeenCalled();
        }
      });

      it("should not run any cleanup hooks if execute errors", async () => {
        jest.mocked(specWithChecks.execute).mockRejectedValueOnce(dummyError);

        await runnerWithChecks.run(interaction);

        for (const posthook of posthooks) {
          expect(posthook).not.toHaveBeenCalled();
        }
      });

      it("should gracefully handle errors in cleanup hook", async () => {
        jest.mocked(checks[0].afterExecute!).mockRejectedValueOnce(dummyError);

        await runnerWithChecks.run(interaction);

        expect(errorHandlerSpy).toHaveBeenCalledWith(interaction, dummyError);
      });

      it("should NOT short-circuit if a cleanup hook errors", async () => {
        jest.mocked(checks[1].afterExecute!).mockRejectedValueOnce(dummyError);

        await runnerWithChecks.run(interaction);

        expect(checks[2].afterExecute).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      jest.mocked(spec.execute).mockRejectedValueOnce(dummyError);
    });

    function expectCalledWithErrorReply(func: any): void {
      expect(func).toHaveBeenCalledWith(
        expect.objectContaining<InteractionReplyOptions>({ ephemeral: true }),
      );
    }

    it("should reply with error if callback errors", async () => {
      const interaction = getCommandInteraction();
      await runner.run(interaction);
      expectCalledWithErrorReply(interaction.reply);
    });

    it("should follow up with error if already replied", async () => {
      const interaction = getCommandInteraction({ replied: true });
      await runner.run(interaction);
      expectCalledWithErrorReply(interaction.followUp);
    });

    it("should follow up with error if deferred", async () => {
      const interaction = getCommandInteraction({ deferred: true });
      await runner.run(interaction);
      expectCalledWithErrorReply(interaction.followUp);
    });

    it("should specially handle Missing Permissions error", async () => {
      const interaction = getCommandInteraction();
      jest.mocked(spec.execute).mockRejectedValueOnce(dummyError);
      jest.mocked(isMissingPermissions).mockReturnValueOnce(true);
      const replyGetterSpy = jest.spyOn(
        commandErrors,
        "getReplyForMissingPermissions",
      );

      await runner.run(interaction);

      expect(replyGetterSpy).toHaveBeenCalled();
    });
  });
});

describe("resolveAutocomplete", () => {
  const autocompleteInteraction = {} as AutocompleteInteraction;

  it("should call just the autocomplete callback", async () => {
    const spec: CommandSpec = {
      definition: {} as RESTPostAPIChatInputApplicationCommandsJSONBody,
      execute: jest.fn(),
      autocomplete: jest.fn(),
      checks: [{ predicate: jest.fn() }],
    };
    const runner = new CommandRunner(spec);

    await runner.resolveAutocomplete(autocompleteInteraction);

    expect(spec.autocomplete).toHaveBeenCalledWith(autocompleteInteraction);
    expect(spec.execute).not.toHaveBeenCalled();
    expect(spec.checks![0].predicate).not.toHaveBeenCalled();
  });

  it("should do nothing if no autocomplete callback provided", async () => {
    const spec: CommandSpec = {
      definition: {} as RESTPostAPIChatInputApplicationCommandsJSONBody,
      execute: jest.fn(),
    };
    const runner = new CommandRunner(spec);

    await runner.resolveAutocomplete(autocompleteInteraction);

    expect(spec.execute).not.toHaveBeenCalled();
  });
});

describe("getDeployJSON", () => {
  it("should return the spec's definition", () => {
    const spec: CommandSpec = {
      definition: {
        name: "dummy-command-name",
      } as RESTPostAPIChatInputApplicationCommandsJSONBody,
      execute: jest.fn(),
    };
    const runner = new CommandRunner(spec);

    const result = runner.getDeployJSON();

    expect(result).toEqual(spec.definition);
  });
});
