import {
  Attachment,
  Awaitable,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  Embed,
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
import { DEVELOPER_UIDS } from "../src/config";
import { RoleLevel } from "../src/middleware/privilege.middleware";
import cooldownService from "../src/services/cooldown.service";
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

    // Make options by default return null, not undefined, since client code is
    // likely to explicitly check against null.
    this.interaction.options.getAttachment.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getBoolean.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getChannel.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getInteger.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getMember.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getMentionable.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getNumber.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getRole.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getString.calledWith(expect.any(String))
      .mockReturnValue(null);
    this.interaction.options.getUser.calledWith(expect.any(String))
      .mockReturnValue(null);
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
   * Mock that the caller is one of the developers. Shorthand for using
   * `mockCaller` with a specific developer UID.
   */
  public mockCallerIsDev(): this {
    const member = this.interaction.member as DeepMockProxy<GuildMember>;
    member.user.id = DEVELOPER_UIDS[0];
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
    if (type === "User") {
      // SlashCommandBuilder doesn't define an `addMemberOption`, but
      // interaction.options has `getMember`...
      options.getMember.calledWith(name).mockReturnValue(value as null);
    }
    return this;
  }

  /**
   * ASSERT.
   *
   * Expect that the interaction has been replied to with a message mentioning
   * that the caller is missing privilege.
   */
  public expectMentionedMissingPrivilege(level: RoleLevel): void {
    expect(this.interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining(
          `required privilege level: \`${RoleLevel[level]}\``,
        ),
        ephemeral: true,
      }),
    );
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

  /**
   * ASSERT.
   *
   * Shorthand for expecting that the interaction has been replied to with a
   * generic acknowledgement.
   */
  public expectRepliedGenericACK(): void {
    expect(this.interaction.reply).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: "👍", ephemeral: true }),
    );
    expect(this.interaction.reply).toHaveBeenCalledTimes(1);
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
  constructor() { super(false); }

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

    // Cooldown state is, by design, globally shared via CooldownService as its
    // source of truth. Thus, we should make sure cooldown state is independent
    // between tests.
    const manager = cooldownService.getManager(this.listener.spec.id);
    manager?.clearCooldowns();

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
   * Mock the embeds attached to the message.
   */
  public mockEmbeds(...embeds: Embed[]): this {
    addMockGetter(this.message, "embeds", embeds);
    return this;
  }

  /**
   * ARRANGE.
   *
   * Mock the attachments attached to the message.
   */
  public mockAttachments(...attachments: Attachment[]): this {
    addMockGetter(this.message, "attachments", attachments);
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
      addMockGetter(this.message.member!, "id", options.uid);
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
    const manager = cooldownService.getManager(this.listener.spec.id);
    if (!manager) {
      throw new Error(
        `listener ${this.listener.spec.id} doesn't have a cooldown manager`)
      ;
    }
    manager.refresh(this.message);
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
      this.message.channelId = options.cid;
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
   * Shorthand for expecting that the message has been replied to in any way.
   */
  public expectReplied(): void {
    expect(this.message.reply).toHaveBeenCalled();
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

export function suppressConsoleError(): void {
  jest.spyOn(console, "error").mockImplementation(() => { });
}
