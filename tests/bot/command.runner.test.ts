jest.mock("../../src/utils/logging.utils");

import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  InteractionReplyOptions,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { CommandRunner } from "../../src/bot/command.runner";
import { CommandSpec } from "../../src/types/command.types";
import { suppressConsoleError } from "../test-utils";

function getCommandInteraction(options?: {
  replied?: boolean,
  deferred?: boolean,
}): ChatInputCommandInteraction {
  return {
    replied: !!options?.replied,
    deferred: !!options?.deferred,
    reply: jest.fn(),
    followUp: jest.fn(),
  } as unknown as ChatInputCommandInteraction;
}

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

  describe("error handling", () => {
    beforeEach(() => {
      jest.mocked(spec.execute).mockRejectedValueOnce(new Error("DUMMY-ERROR"));
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
