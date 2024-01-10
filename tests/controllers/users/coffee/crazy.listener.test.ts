import crazySpec from "../../../../src/controllers/users/coffee/crazy.listener";
import { MockMessage } from "../../../test-utils";

const COPYPASTA = [
  "Crazy?",
  "I was crazy once.",
  "They locked me in a room",
  "A rubber room",
  "A rubber room with rats",
  "And rats make me crazy",
];

describe("responding with the next line in the copypasta", () => {
  for (let i = 0; i < COPYPASTA.length; i++) {
    const line = COPYPASTA[i];
    const nextLine = COPYPASTA[(i + 1) % COPYPASTA.length]; // Loop back.
    it(`should reply to '${line}' with '${nextLine}'`, async () => {
      const mock = new MockMessage(crazySpec).mockContent(line);
      await mock.simulateEvent();
      mock.expectRepliedSilentlyWith({ content: nextLine });
    });
  }
});

it("should do nothing if the line isn't in the copypasta", async () => {
  const mock = new MockMessage(crazySpec).mockContent("lorem ipsum");
  await mock.simulateEvent();
  mock.expectNotResponded();
});
