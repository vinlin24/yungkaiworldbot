import _ from "lodash";

import notFunniSpec from "../../../../src/controllers/users/ni/not-funni.listener";
import { MockMessage } from "../../../test-utils";

let mock: MockMessage;
beforeEach(() => { mock = new MockMessage(notFunniSpec); });

it("should reply saying this is veri not funni", async () => {
  mock.mockContent("this is veri not funni");
  jest.spyOn(_, "random").mockReturnValueOnce(1);

  await mock.simulateEvent();

  mock.expectRepliedSilentlyWith("this is veri not funni");
});

it("should respond with a random number of veri", async () => {
  mock.mockContent("this is veri not funni");
  jest.spyOn(_, "random").mockReturnValueOnce(3);

  await mock.simulateEvent();

  mock.expectRepliedSilentlyWith("this is veriveriveri not funni");
});

it("should not respond if it's not not very funni", async () => {
  mock.mockContent("hello there");

  await mock.simulateEvent();

  mock.expectNotResponded();
});
