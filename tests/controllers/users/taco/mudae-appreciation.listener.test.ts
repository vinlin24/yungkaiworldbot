import { Embed } from "discord.js";

import env from "../../../../src/config";
import onAppreciatedCharSpec, {
  NAMES_TO_APPRECIATE,
} from "../../../../src/controllers/users/taco/mudae-appreciation.listener";
import { MockMessage } from "../../../test-utils";

for (const [nameToDetect, nameToAppreciate] of NAMES_TO_APPRECIATE) {
  it(`should appreciate ${nameToDetect}`, async () => {
    const mock = new MockMessage(onAppreciatedCharSpec)
      .mockAuthor({ uid: env.MUDAE_UID, bot: true })
      .mockEmbeds({ author: { name: nameToDetect } } as Embed);
    await mock.simulateEvent();
    mock.expectRepliedSilentlyWith(`daily ${nameToAppreciate} appreciation`);
  });
}
