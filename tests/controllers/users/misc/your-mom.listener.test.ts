jest.mock("../../../../src/utils/math.utils");

import yourMomSpec, {
  YOUR_MOM_RESPONSES,
} from "../../../../src/controllers/users/misc/your-mom.listener";
import { randRange } from "../../../../src/utils/math.utils";
import { MockMessage } from "../../../test-utils";

const mockedRandRange = jest.mocked(randRange);

for (const [index, response] of YOUR_MOM_RESPONSES.entries()) {
  it(`should respond with "${response}"`, async () => {
    const mock = new MockMessage(yourMomSpec).mockContent("your mom");
    mockedRandRange.mockReturnValueOnce(index);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith(response);
  });
}
