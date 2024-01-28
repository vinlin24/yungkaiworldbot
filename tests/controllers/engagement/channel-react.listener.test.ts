import { Attachment, Message } from "discord.js";

import {
  ARTWORK_CID,
  COOKING_TIME_CID,
  GAMING_CID,
  INTRODUCTIONS_CID,
  MEDIA_CID,
  MUSIC_CHAT_CID,
  STINKYS_FRIENDS_CID,
} from "../../../src/config";
import channelReactSpec from "../../../src/controllers/engagement/channel-react.listener";
import { MockMessage } from "../../test-utils";

let mock: MockMessage;
beforeEach(() => mock = new MockMessage(channelReactSpec));

describe("PATTERN 1: non-reply messages with image attachments", () => {
  function arrangeWithAttachment(cid: string): void {
    mock
      .mockChannel({ cid })
      .mockAttachments({ contentType: "image/png" } as Attachment);
  }

  it("should react to posted artwork", async () => {
    arrangeWithAttachment(ARTWORK_CID);
    await mock.simulateEvent();
    mock.expectReactedWith("🤩");
  });

  it("should react to posted media", async () => {
    arrangeWithAttachment(MEDIA_CID);
    await mock.simulateEvent();
    mock.expectReactedWith("❤️");
  });

  it("should react to posted pet pictures", async () => {
    arrangeWithAttachment(STINKYS_FRIENDS_CID);
    await mock.simulateEvent();
    mock.expectReactedWith("🥺");
  });

  it("should react to gaming pictures", async () => {
    arrangeWithAttachment(GAMING_CID);
    await mock.simulateEvent();
    mock.expectReactedWith("🫡");
  });

  it("should react to food pictures", async () => {
    arrangeWithAttachment(COOKING_TIME_CID);
    await mock.simulateEvent();
    mock.expectReactedWith("🤤");
  });
});

describe("PATTERN 2: messages that have no replies", () => {
  it("should wave at what looks like an introduction", async () => {
    mock
      .mockChannel({ cid: INTRODUCTIONS_CID })
      .mockContent("hi i'm joe");
    await mock.simulateEvent();
    mock.expectReactedWith("👋");
  });

  it("should ignore messages that are replies", async () => {
    mock
      .mockChannel({ cid: INTRODUCTIONS_CID })
      .mockContent("hi joe i'm dave")
      .mockReference({ content: "hi i'm joe" } as Message);
    await mock.simulateEvent();
    mock.expectNotResponded();
  });
});

describe("PATTERN 3: Spotify song links", () => {
  it("should react to shared song links", async () => {
    mock
      .mockChannel({ cid: MUSIC_CHAT_CID })
      .mockContent(
        "yo this song is fire: https://open.spotify.com/track/" +
        "5Yiwmn4PZAzVAms9UDICU2?si=ae5ddf5fd3f345ce lol",
      );
    await mock.simulateEvent();
    mock.expectReactedWith("🔥");
  });

  it("should ignore messages that don't contain song links", async () => {
    mock.mockChannel({ cid: MUSIC_CHAT_CID }).mockContent("nice one!");
    await mock.simulateEvent();
    mock.expectNotResponded();
  });
});
