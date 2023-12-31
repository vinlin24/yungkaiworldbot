import {
  Awaitable,
  ChatInputCommandInteraction,
  Collection,
  CommandInteractionOptionResolver,
  EmojiIdentifierResolvable,
  Events,
  GuildMember,
  InteractionReplyOptions,
  Message,
  MessageFlags,
  MessageReplyOptions
} from "discord.js";
import {
  DeepMockProxy,
  Matcher,
  mockDeep,
  mockReset,
} from "jest-mock-extended";

import { CommandRunner } from "../src/bot/command.runner";
import { ListenerRunner } from "../src/bot/listener.runner";
import { IClientWithIntentsAndRunners } from "../src/types/client.abc";
import { CommandSpec } from "../src/types/command.types";
import { ListenerSpec } from "../src/types/listener.types";

/**
 * Default delay to use between emitting an event and querying a listener. This
 * is to give the listener time to receive and process the event.
 */
const DEFAULT_EVENT_EMIT_DELAY_MSEC = 100;

export type OptionType =
  | "Attachment"
  | "Boolean"
  | "Channel"
  | "Integer"
  | "Member"
  | "Mentionable"
  | "Message"
  | "Number"
  | "Role"
  | "String"
  | "User";

/**
 * Manager for mocking a `ChatInputCommandInteraction`.
 */
export class MockInteraction {
  /** The wrapped (and deep mocked) interaction object. */
  public readonly interaction: DeepMockProxy<ChatInputCommandInteraction>;
  /** The command this interaction is to be passed into. */
  public readonly command: CommandRunner;

  constructor(spec: CommandSpec) {
    this.interaction = mockDeep<ChatInputCommandInteraction>();
    this.command = new CommandRunner(spec);
    // Automatically handle resetting this instance before every test.
    beforeEach(() => mockReset(this.interaction));
  }

  /**
   * ACT.
   *
   * Simulate the command execute pipeline, passing in the underlying arranged
   * interaction object.
   */
  public async runCommand(): Promise<void> {
    await this.command.run(this.interaction);
  }

  /**
   * ARRANGE.
   *
   * Mock that the caller of this interaction has the roles specified by the
   * provided IDs.
   */
  public mockCallerRoles(...roleIds: string[]): void {
    const member = this.interaction.member as DeepMockProxy<GuildMember>;
    const matcher = new Matcher<string>(roleId => roleIds.includes(roleId), "");
    member.roles.cache.has.calledWith(matcher).mockReturnValue(true);
  }

  /**
   * ARRANGE.
   *
   * Mock an option value on this interaction.
   */
  public mockOption(type: OptionType, name: string, value: any): void {
    const options
      = this.interaction.options as DeepMockProxy<CommandInteractionOptionResolver>;
    options[`get${type}`].calledWith(name).mockReturnValue(value);
  }


  /**
   * ASSERT.
   *
   * Shorthand for expecting that the interaction has been replied to with the
   * specified argument.
   */
  public expectRepliedWith(options: string | InteractionReplyOptions): void {
    expect(this.interaction.reply).toHaveBeenLastCalledWith(
      expect.objectContaining(options),
    );
    expect(this.interaction.reply).toHaveBeenCalledTimes(1);
  }

  public async testBroadcastOptionSupport(
    arrange?: (mock: this) => Awaitable<any>,
  ) {
    it("should respond ephemerally by default", async () => {
      if (arrange) await arrange(this);
      await this.runCommand();
      this.expectRepliedWith({ ephemeral: true });
    });

    it("should respond publicly if the broadcast option is set", async () => {
      if (arrange) await arrange(this);
      this.mockOption("Boolean", "broadcast", true);
      await this.runCommand();
      this.expectRepliedWith({ ephemeral: false });
    });
  }
}

export function addMockGetter<PropertyType>(
  obj: Record<string, any>,
  key: string,
  value: PropertyType,
): void;
export function addMockGetter<PropertyType>(
  obj: Record<string, any>,
  key: string,
  getter: () => PropertyType,
): void;
/**
 * Add a mock getter on the object. This is a workaround for jest-mock-extended
 * not supporting mocking getters yet.
 */
export function addMockGetter<ValueType>(
  obj: Record<string, any>,
  key: string,
  getter: ValueType | (() => ValueType),
): jest.Mock<ValueType, [], any> {
  const mockGetter = jest.fn<ValueType, []>();
  if (getter instanceof Function)
    mockGetter.mockImplementation(getter);
  else
    mockGetter.mockReturnValue(getter);
  Object.defineProperty(obj, key, {
    get: mockGetter,
    configurable: true, // Allow redefining existing properties.
  });
  return mockGetter;
}

class TestClient extends IClientWithIntentsAndRunners {
  public override readonly commandRunners
    = new Collection<string, CommandRunner>();
  public override readonly listenerRunners
    = new Collection<string, ListenerRunner<any>>();
}

export type MockMessageOptions = {
  emitDelay?: number;
};

/**
 * Manager for mocking a message emitted by `Events.MessageCreate`.
 */
export class MockMessage {
  /** The wrapped (and deep mocked) message object. */
  public readonly message: DeepMockProxy<Message>;
  /** The listener this message is to be passed into. */
  public readonly listener: ListenerRunner<Events.MessageCreate>;

  /** Event-emitting client to register the listener onto. */
  private client = new TestClient();
  /** Wrapper options. */
  private options?: MockMessageOptions;

  constructor(
    spec: ListenerSpec<Events.MessageCreate>,
    options?: MockMessageOptions,
  ) {
    this.message = mockDeep<Message>();
    this.listener = new ListenerRunner(spec);
    this.client.listenerRunners.set(spec.id, this.listener);
    this.client.registerListeners();
    this.options = options;

    // Automatically handle resetting this instance before every test.
    beforeEach(() => mockReset(this.message));
  }

  /**
   * ACT.
   *
   * Simulate the listener execute pipeline by emitting the message creation
   * event with the underlying message object.
   */
  public async emitEvent(): Promise<void> {
    this.client.emit(Events.MessageCreate, this.message);
    await sleep(this.options?.emitDelay ?? DEFAULT_EVENT_EMIT_DELAY_MSEC);
  }

  /**
   * ARRANGE.
   *
   * Mock the content of the message.
   */
  public mockContent(content: string): void {
    this.message.content = content;
  }

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the message has been replied to with the
   * specified argument.
   */
  public expectRepliedWith(options: string | MessageReplyOptions): void {
    expect(this.message.reply).toHaveBeenLastCalledWith(
      expect.objectContaining(options),
    );
    expect(this.message.reply).toHaveBeenCalledTimes(1);
  }

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the message has been reacted to with the
   * specified emojis.
   */
  public expectReactedWith(...emojis: EmojiIdentifierResolvable[]): void {
    for (const [index, emoji] of emojis.entries()) {
      const n = index + 1; // "nth call" counts from 1.
      expect(this.message.react).toHaveBeenNthCalledWith(n, emoji);
    }
  }

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the message has been reacted to with the
   * specified custom guild emojis. `customReacter` is the mock for the function
   * resolving emoji name to `GuildEmoji`.
   *
   * NOTE: The caller has to be the one to pass in the mock of the `GuildEmoji`
   * resolver since this helper module used by multiple test files shouldn't be
   * the one mocking modules.
   */
  public expectReactedWithCustom(
    // Have the caller pass in the mock of reactCustomEmoji (or equivalent
    // interfaces) since a helper module used by multiple test files shouldn't
    // be the one mocking modules.
    customReacter: jest.MockedFunctionDeep<
      (message: Message, emojiName: string) => Promise<any>
    >,
    ...emojiNames: string[]
  ): void {
    for (const [index, emojiName] of emojiNames.entries()) {
      const n = index + 1; // "nth call" counts from 1.
      expect(customReacter).toHaveBeenNthCalledWith(n, this.message, emojiName);
    }
  }

  /**
   * ASSERT.
   *
   * Similar to `expectRepliedWith` but expect that the reply was done so
   * "silently" (no pinging).
   */
  public expectRepliedSilentlyWith(
    options: Partial<MessageReplyOptions>,
  ): void {
    this.expectRepliedWith({
      ...options,
      allowedMentions: expect.objectContaining({ parse: [] }),
      flags: MessageFlags.SuppressNotifications,
    });
  }


  /**
   * ASSERT.
   *
   * Expect that the message has not been "responded" to in any visible way.
   * That is, none of:
   *
   * - Reacting to the message.
   * - Replying to the message.
   * - Sending a message in the channel.
   *
   * Note that this list is not exhaustive. The listener could have taken other
   * forms of stateful actions that would not be detected by this method.
   */
  public expectNotResponded(): void {
    expect(this.message.reply).not.toHaveBeenCalled();
    expect(this.message.react).not.toHaveBeenCalled();
    expect(this.message.channel.send).not.toHaveBeenCalled();
  }
}

/**
 * Asynchronously yield for `msec` milliseconds. Does what you expect.
 */
export async function sleep(msec: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, msec));
}

/**
 * Shorthand for running the pair of tests testing the universal `broadcast`
 * command option. Takes an optional `arrange` callback to properly initialize
 * the `mock` object before each test.
 */
export async function testBroadcastOptionSupport(
  mock: MockInteraction,
  arrange?: (mock: MockInteraction) => Awaitable<any>,
): Promise<void> {
  it("should respond ephemerally by default", async () => {
    if (arrange) await arrange(mock);
    await mock.runCommand();
    mock.expectRepliedWith({ ephemeral: true });
  });

  it("should respond publicly if the broadcast option is set", async () => {
    if (arrange) await arrange(mock);
    mock.mockOption("Boolean", "broadcast", true);
    await mock.runCommand();
    mock.expectRepliedWith({ ephemeral: false });
  });
}

/**
 * Shorthand for running the pair of tests testing the universal `ephemeral`
 * command option. Takes an optional `arrange` callback to properly initialize
 * the `mock` object before each test.
 */
export async function testEphemeralOptionSupport(
  mock: MockInteraction,
  arrange?: (mock: MockInteraction) => Awaitable<any>,
): Promise<void> {
  it("should respond publicly by default", async () => {
    if (arrange) await arrange(mock);
    await mock.runCommand();
    mock.expectRepliedWith({ ephemeral: false });
  });

  it("should respond ephemerally if the ephemeral option is set", async () => {
    if (arrange) await arrange(mock);
    mock.mockOption("Boolean", "ephemeral", true);
    await mock.runCommand();
    mock.expectRepliedWith({ ephemeral: true });
  });
}
