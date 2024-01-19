import config from "../../../../src/config";
import uwuSpec from "../../../../src/controllers/users/coffee/uwu.listener";
import { GUILD_EMOJIS } from "../../../../src/utils/emojis.utils";
import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(uwuSpec); });

it("should react with vomit", async () => {
  mock.mockContent("uwu");
  await mock.simulateEvent();
  mock.expectReactedWith("🤢", "🤮");
});

it("should do nothing if conditions not met", async () => {
  mock.mockContent("general kenobi!");
  await mock.simulateEvent();
  mock.expectNotResponded();
});

it("should trigger even on extended uwu", async () => {
  mock.mockContent("uwuuuuuuuuuuuuuu");
  await mock.simulateEvent();
  mock.expectReactedWith("🤢", "🤮");
});

it("should react with kofi if coffee says uwu", async () => {
  mock.mockContent("uwu").mockAuthor({ uid: config.COFFEE_UID });
  await mock.simulateEvent();
  mock.expectReactedWith(GUILD_EMOJIS.KOFI);
});
