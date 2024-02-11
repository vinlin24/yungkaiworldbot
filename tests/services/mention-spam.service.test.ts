import { MentionSpamService } from "../../src/services/mention-spam.service";
import { PerIDSpamTracker } from "../../src/utils/algorithms.utils";

const mentioner = "123456789";
const mentioned1 = "987654321";
const mentioned2 = "424242420";

let mentionSpamService: MentionSpamService;
let trackerSpy: jest.SpyInstance<boolean, [id: string]>;
beforeEach(() => {
  mentionSpamService = new MentionSpamService();
  trackerSpy = jest.spyOn(PerIDSpamTracker.prototype, "reportEvent");
});

it("should report an event upon mention", async () => {
  mentionSpamService.mentioned(mentioner, mentioned1);
  expect(trackerSpy).toHaveBeenCalled();
});

it("should return true if mentioner is within rate limit", async () => {
  trackerSpy.mockReturnValueOnce(true);
  const result = mentionSpamService.mentioned(mentioner, mentioned1);
  expect(result).toEqual(true);
});

it("should return false if mentioner exceeds rate limit", async () => {
  trackerSpy.mockReturnValueOnce(false);
  const result = mentionSpamService.mentioned(mentioner, mentioned1);
  expect(result).toEqual(false);
});

it("should count mentions to different users independently", async () => {
  // Reach the rate limit mentioning dummy target 1.
  for (let i = 0; i < 3; i++) {
    mentionSpamService.mentioned(mentioner, mentioned1);
  }
  expect(mentionSpamService.mentioned(mentioner, mentioned1)).toEqual(false);
  expect(mentionSpamService.mentioned(mentioner, mentioned2)).toEqual(true);
});
