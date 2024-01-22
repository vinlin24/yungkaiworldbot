import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Interaction,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

import { CommandRunner } from "../../../src/bot/command.runner";
import { ListenerRunner } from "../../../src/bot/listener.runner";
import commandDispatcherSpec from "../../../src/bot/listeners/command.listener";
import { TestClient, addMockGetter } from "../../test-utils";

const testRunner = new ListenerRunner(commandDispatcherSpec);
/**
 * UUT: listener execution pipeline entry point.
 *
 * TODO: Is this still coupling dependencies? What if ListenerRunner itself is
 * faulty?
 */
const simulateEvent = testRunner.callbackToRegister;

const dummyCommandName = "dummy-command";

const mockedRun = jest.fn();
const mockedResolveAutocomplete = jest.fn();

function arrangeMockClient(interaction: DeepMockProxy<Interaction>): void {
  const dummyRunner = {
    run: mockedRun,
    resolveAutocomplete: mockedResolveAutocomplete,
  } as unknown as CommandRunner;
  const testClient = new TestClient();
  testClient.commandRunners.set(dummyCommandName, dummyRunner);
  addMockGetter(interaction, "client", testClient);
}

function arrangeMockCommandInteraction(
  commandName: string,
): DeepMockProxy<ChatInputCommandInteraction> {
  const interaction = mockDeep<ChatInputCommandInteraction>();
  interaction.isChatInputCommand.mockReturnValue(true);
  interaction.isAutocomplete.mockReturnValue(false);
  interaction.isRepliable.mockReturnValue(true);
  interaction.commandName = commandName;
  arrangeMockClient(interaction);
  return interaction;
}

function arrangeMockAutocompleteInteraction(
  commandName: string,
): DeepMockProxy<AutocompleteInteraction> {
  const interaction = mockDeep<AutocompleteInteraction>();
  interaction.isAutocomplete.mockReturnValue(true);
  interaction.isChatInputCommand.mockReturnValue(false);
  interaction.isRepliable.mockReturnValue(false);
  interaction.commandName = commandName;
  arrangeMockClient(interaction);
  return interaction;
}

describe("slash command dispatching", () => {
  let interaction: DeepMockProxy<ChatInputCommandInteraction>;
  beforeEach(() => {
    interaction = arrangeMockCommandInteraction(dummyCommandName);
  });

  it("should execute the slash command runner", async () => {
    await simulateEvent(interaction);
    expect(mockedRun).toHaveBeenCalledWith(interaction);
  });

  it("should fail gracefully when runner errors", async () => {
    mockedRun.mockRejectedValue("DUMMY-ERROR");
    await simulateEvent(interaction);
    expect(mockedRun).toHaveBeenCalledWith(interaction);
  });
});

describe("autocomplete dispatching", () => {
  let interaction: DeepMockProxy<AutocompleteInteraction>;
  beforeEach(() => {
    interaction = arrangeMockAutocompleteInteraction(dummyCommandName);
  });

  it("should execute the autocomplete handler", async () => {
    await simulateEvent(interaction);
    expect(mockedResolveAutocomplete).toHaveBeenCalledWith(interaction);
  });

  it("should fail gracefully when handler errors", async () => {
    mockedResolveAutocomplete.mockRejectedValue("DUMMY-ERROR");
    await simulateEvent(interaction);
    expect(mockedResolveAutocomplete).toHaveBeenCalledWith(interaction);
  });
});

describe("unknown interactions", () => {
  it("should fail gracefully if runner is not found", async () => {
    const interaction = arrangeMockAutocompleteInteraction("unknown-command");

    await simulateEvent(interaction);

    expect(mockedRun).not.toHaveBeenCalled();
    expect(mockedResolveAutocomplete).not.toHaveBeenCalled();
  });

  it("should tell caller if command doesn't exist anymore", async () => {
    const interaction = arrangeMockCommandInteraction("unknown-command");

    await simulateEvent(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
      content: "It looks like that command doesn't exist anymore! Sorry!",
      ephemeral: true,
    }));
    expect(mockedRun).not.toHaveBeenCalled();
    expect(mockedResolveAutocomplete).not.toHaveBeenCalled();
  });

  it("should do nothing if interaction is other type", async () => {
    // TODO: If we ever do implement handling this type of interaction, this
    // test needs to be changed.
    const interaction = mockDeep<UserContextMenuCommandInteraction>();
    interaction.isChatInputCommand.mockReturnValue(false);
    interaction.isAutocomplete.mockReturnValue(false);
    interaction.isRepliable.mockReturnValue(false);

    await simulateEvent(interaction);

    expect(mockedRun).not.toHaveBeenCalled();
    expect(mockedResolveAutocomplete).not.toHaveBeenCalled();
  });
});
