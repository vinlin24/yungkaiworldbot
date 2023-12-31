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
  MessageReplyOptions,
} from "discord.js";
import {
  DeepMockProxy,
  Matcher,
  mockDeep,
} from "jest-mock-extended";

import { CommandRunner } from "../src/bot/command.runner";
import { ListenerRunner } from "../src/bot/listener.runner";
import { IClientWithIntentsAndRunners } from "../src/types/client.abc";
import { CommandSpec } from "../src/types/command.types";
import { ListenerSpec } from "../src/types/listener.types";

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
  }

  /**
   * ACT.
   *
   * Simulate the emission of the interaction create event, passing the
   * underlying interaction object directly into the command execution pipeline.
   */
  public async simulateCommand(): Promise<void> {
    await this.command.run(this.interaction);
  }

  /**
   * ARRANGE.
   *
   * Mock the client attached to the interaction.
   */
  public mockClient(client: IClientWithIntentsAndRunners): this {
    addMockGetter(this.interaction, "client", client);
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock that the caller of this interaction has the roles specified by the
   * provided IDs.
   */
  public mockCallerRoles(...roleIds: string[]): this {
    const member = this.interaction.member as DeepMockProxy<GuildMember>;
    const matcher = new Matcher<string>(roleId => roleIds.includes(roleId), "");
    member.roles.cache.has.calledWith(matcher).mockReturnValue(true);
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock an option value on this interaction.
   */
  public mockOption(type: OptionType, name: string, value: any): this {
    const options
      = this.interaction.options as DeepMockProxy<CommandInteractionOptionResolver>;
    options[`get${type}`].calledWith(name).mockReturnValue(value);
    return this;
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
      await this.simulateCommand();
      this.expectRepliedWith({ ephemeral: true });
    });

    it("should respond publicly if the broadcast option is set", async () => {
      if (arrange) await arrange(this);
      this.mockOption("Boolean", "broadcast", true);
      await this.simulateCommand();
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
 * not supporting mocking getters yet. This can also be used to overwrite
 * read-only properties.
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

export class TestClient extends IClientWithIntentsAndRunners {
  public override readonly commandRunners
    = new Collection<string, CommandRunner>();
  public override readonly listenerRunners
    = new Collection<string, ListenerRunner<any>>();
}

/**
 * Parameter options for `MockMessage#mockAuthor`. To be extended over time.
 */
type AuthorOptions = Partial<{
  uid: string,
  displayName: string,
}>;

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

  constructor(spec: ListenerSpec<Events.MessageCreate>) {
    this.message = mockDeep<Message>();
    this.listener = new ListenerRunner(spec);
    this.client.listenerRunners.set(spec.id, this.listener);
    this.client.registerListeners();
    // TODO: A "spec" shouldn't have state saved on it but it does at the moment
    // in the form of CooldownManager. Thus, we have to manually reset this
    // manager for each instance of MockMessage to make sure tests using a
    // distinct MockMessage don't share cooldown state.
    this.listener.spec.cooldown?.clearCooldowns();
  }

  /**
   * ACT.
   *
   * Simulate the emission of the message creation event by passing the
   * underlying message object directly to the listener execute pipeline.
   */
  public async simulateEvent(): Promise<void> {
    await this.listener.callbackToRegister(this.message);
  }

  /**
   * ARRANGE.
   *
   * Mock the content of the message.
   */
  public mockContent(content: string): this {
    this.message.content = content;
    return this;
  }

  public mockAuthorBot(isBot: boolean): this {
    this.message.author.bot = isBot;
    return this;
  }

  /**
   * @deprecated Use the more general `mockAuthor` method instead.
   */
  public mockAuthorId(uid: string): this {
    this.message.author.id = uid;
    return this;
  }

  public mockAuthor(options: AuthorOptions): this {
    if (options.uid !== undefined)
      this.message.author.id = options.uid;
    if (options.displayName !== undefined)
      addMockGetter(this.message.author, "displayName", options.displayName);
    return this;
  }

  public mockCooldownActive(): this {
    if (!this.listener.spec.cooldown) {
      throw new Error(
        `listener ${this.listener.spec.id} doesn't have a cooldown manager`)
      ;
    }
    this.listener.spec.cooldown.refresh(this.message);
    return this;
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
    await mock.simulateCommand();
    mock.expectRepliedWith({ ephemeral: true });
  });

  it("should respond publicly if the broadcast option is set", async () => {
    if (arrange) await arrange(mock);
    mock.mockOption("Boolean", "broadcast", true);
    await mock.simulateCommand();
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
    await mock.simulateCommand();
    mock.expectRepliedWith({ ephemeral: false });
  });

  it("should respond ephemerally if the ephemeral option is set", async () => {
    if (arrange) await arrange(mock);
    mock.mockOption("Boolean", "ephemeral", true);
    await mock.simulateCommand();
    mock.expectRepliedWith({ ephemeral: true });
  });
}
