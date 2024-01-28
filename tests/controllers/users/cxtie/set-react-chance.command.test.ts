import { BABY_MOD_RID } from "../../../../src/config";
import setReactChanceSpec from "../../../../src/controllers/users/cxtie/set-react-chance.command";
import cxtieService from "../../../../src/services/cxtie.service";
import { MockInteraction } from "../../../test-utils";

it("should update the service with the new chance", async () => {
  const mock = new MockInteraction(setReactChanceSpec)
    .mockCallerRoles(BABY_MOD_RID)
    .mockOption("Number", "probability", 0.42);
  const setterSpy = jest.spyOn(cxtieService, "reactChance", "set");

  await mock.simulateCommand();

  expect(setterSpy).toHaveBeenCalledWith(0.42);
  setterSpy.mockRestore();
});

it("should reply to the caller with the updated probability", async () => {
  const mock = new MockInteraction(setReactChanceSpec)
    .mockCallerRoles(BABY_MOD_RID)
    .mockOption("Number", "probability", 0.42);

  await mock.simulateCommand();

  expect(mock.interaction.reply)
    .toHaveBeenLastCalledWith(expect.stringContaining("0.42"));
  expect(mock.interaction.reply)
    .toHaveBeenCalledTimes(1);
});

it("should require privilege level >= BABY_MOD", async () => {
  const mock = new MockInteraction(setReactChanceSpec)
    .mockOption("Number", "probability", 0.42);
  const setterSpy = jest.spyOn(cxtieService, "reactChance", "set");

  await mock.simulateCommand();

  expect(setterSpy).not.toHaveBeenCalled();
  setterSpy.mockRestore();
  mock.expectRepliedWith({}); // Replied with anything.
});
