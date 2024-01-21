import {
  Awaitable,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  EmojiIdentifierResolvable,
  Events,
  GuildMember,
  GuildTextBasedChannel,
  InteractionReplyOptions,
  Message,
  MessageFlags,
  MessageReference,
  MessageReplyOptions,
} from "discord.js";
import { DeepMockProxy, Matcher, mockDeep } from "jest-mock-extended";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

import { CommandRunner } from "../src/bot/command.runner";
import { ListenerRunner } from "../src/bot/listener.runner";
import { ClientWithIntentsAndRunnersABC } from "../src/types/client.abc";
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
 * Parameter options for `MockMessage#mockAuthor` and
 * `MockInteraction#mockCaller`. To be extended over time.
 */
type MockAuthorOptions = Partial<{
  uid: string;
  displayName: string;
  bot: boolean;
  roleIds: string[],
}>;

function mockRoles(member: DeepMockProxy<GuildMember>, ids: string[]): void {
  const matcher = new Matcher<string>(roleId => ids.includes(roleId), "");
  member.roles.cache.has.calledWith(matcher).mockReturnValue(true);
}

/**
 * Manager for mocking a `ChatInputCommandInteraction`.
 */
export class MockInteraction {
  /** The wrapped (and deep mocked) interaction object. */
  public readonly interaction: DeepMockProxy<ChatInputCommandInteraction>;
  /** The command this interaction is to be passed into. */
  public readonly command: CommandRunner;
  /** The client stub attached to the mock interaction. */
  public readonly client: DeepMockProxy<TestClient>;

  constructor(spec: CommandSpec) {
    this.interaction = mockDeep<ChatInputCommandInteraction>();
    this.command = new CommandRunner(spec);

    // Override attached client with stub.
    this.client = mockDeep<TestClient>();
    addMockGetter(this.interaction, "client", this.client);
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
  public mockClient(client: ClientWithIntentsAndRunnersABC): this {
    addMockGetter(this.interaction, "client", client);
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock the caller of this command.
   */
  public mockCaller(options: MockAuthorOptions): this {
    const member = this.interaction.member as DeepMockProxy<GuildMember>;

    if (options.uid !== undefined) {
      member.user.id = options.uid;
      addMockGetter(member, "id", options.uid);
    }
    if (options.displayName !== undefined) {
      addMockGetter(member, "displayName", options.displayName);
      addMockGetter(member.user, "displayName", options.displayName);
    }
    if (options.bot !== undefined) {
      member.user.bot = options.bot;
    }
    if (options.roleIds) {
      mockRoles(member, options.roleIds);
    }

    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock that the caller of this interaction has the roles specified by the
   * provided IDs.
   *
   * @deprecated Use `mockCaller` instead.
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
  public mockOption<T = any>(type: OptionType, name: string, value: T): this {
    const options = this.interaction.options as
      DeepMockProxy<CommandInteractionOptionResolver>;
    // NOTE: For SOME reason, mockReturnValue is always expecting an argument of
    // type null even though the option getter can return other values. `as
    // null` is to pacify this TS error when switching param value from `any` to
    // `T`. Code still works as expected.
    options[`get${type}`].calledWith(name).mockReturnValue(value as null);
    return this;
  }

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the interaction has been replied to in any
   * way.
   */
  public expectReplied(): void {
    expect(this.interaction.reply).toHaveBeenCalled();
  }

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the interaction has been replied to with the
   * specified argument.
   */
  public expectRepliedWith(options: InteractionReplyOptions): void {
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

export function addMockGetter<ObjectType extends object, ValueType>(
  obj: ObjectType,
  key: keyof ObjectType,
  value: ValueType,
): void;
export function addMockGetter<ObjectType extends object, ValueType>(
  obj: ObjectType,
  key: keyof ObjectType,
  getter: () => ValueType,
): void;
/**
 * Add a mock getter on the object. This is a workaround for jest-mock-extended
 * not supporting mocking getters yet. This can also be used to overwrite
 * read-only properties.
 */
export function addMockGetter<ObjectType extends object, ValueType>(
  obj: ObjectType,
  key: keyof ObjectType,
  getter: ValueType | (() => ValueType),
): jest.Mock<ValueType, [], any> {
  const mockGetter = jest.fn<ValueType, []>();
  if (getter instanceof Function) {
    mockGetter.mockImplementation(getter);
  }
  else {
    mockGetter.mockReturnValue(getter);
  }

  Object.defineProperty(obj, key, {
    get: mockGetter,
    configurable: true, // Allow redefining existing properties.
  });
  return mockGetter;
}

/**
 * A client stub for testing. Its public interface has been replaced with Jest
 * mocks.
 */
export class TestClient extends ClientWithIntentsAndRunnersABC {
  public override deploySlashCommands = jest.fn();
  public override prepareRuntime = jest.fn();
  public override clearDefinitions = jest.fn();
}

/**
 * Parameter options for `MockMessage#mockChannel`. To be extended over time.
 */
type MockChannelOptions = Partial<{
  cid: string;
  name: string;
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

    // Reasonable defaults.
    this.message.author.bot = false;
    this.message.reference = null;
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

  /**
   * ARRANGE.
   *
   * Mock the message's author attached to the underlying message object.
   */
  public mockAuthor(options: MockAuthorOptions): this {
    if (options.uid !== undefined) {
      this.message.author.id = options.uid;
    }
    if (options.displayName !== undefined) {
      addMockGetter(this.message.author, "displayName", options.displayName);
    }
    if (options.bot !== undefined) {
      this.message.author.bot = options.bot;
    }
    if (options.roleIds) {
      // NOTE: If the caller wants to use roles, they would have to use
      // message.member instead of message.author anyway since the latter
      // returns a User, not a GuildMember.
      mockRoles(this.message.member!, options.roleIds);
    }
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock the referenced message of the underlying message object.
   */
  public mockReference(message: Message): this {
    const reference: MessageReference = {
      channelId: "MOCK-CHANNEL-ID",
      guildId: "MOCK-GUILD-ID",
      messageId: "MOCK-MESSAGE-ID",
    };
    this.message.reference = reference;
    // @ts-expect-error fetch literally resolves Message. For SOME reason,
    // mockImplementation wants the callback to resolve Collection<string,
    // Message>.
    this.message.channel.messages.fetch.mockImplementation(async (id) => {
      if (id === reference.messageId) return message;
      throw new Error("unknown mock message reference ID");
    });
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock that the cooldown is currently active by refreshing the underlying
   * cooldown manager.
   */
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
   * ARRANGE.
   *
   * Mock properties on the channel attached to the underlying message object.
   */
  public mockChannel(options: MockChannelOptions): this {
    if (options.cid !== undefined) {
      this.message.channel.id = options.cid;
    }
    if (options.name !== undefined) {
      addMockGetter(
        this.message.channel as GuildTextBasedChannel,
        "name",
        options.name,
      );
    }
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
  ): void;
  public expectRepliedSilentlyWith(content: string): void;
  public expectRepliedSilentlyWith(
    arg: Partial<MessageReplyOptions> | string,
  ): void {
    let options: Partial<MessageReplyOptions>;
    if (typeof arg === "string") {
      options = { content: arg };
    }
    else {
      options = arg;
    }
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

/**
 * Check that an object matches a schema. Return silently on success, throw
 * `ValidationError` on failure.
 */
export function expectMatchingSchema(
  obj: unknown,
  schema: z.ZodObject<any>,
): void {
  const result = schema.safeParse(obj);
  if (result.success) return;
  throw fromZodError(result.error);
}

/**
 * Return a spy instance for `Math.random`.
 */
export function spyOnRandom(): jest.SpyInstance {
  return jest.spyOn(global.Math, "random");
}
