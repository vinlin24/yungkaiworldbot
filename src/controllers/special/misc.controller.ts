import { messageFrom } from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilentlyWith } from "../../utils/interaction.utils";

const onGulp = new MessageListener("gulp");

onGulp.filter(messageFrom("BUNNY"));
onGulp.cooldown.set({
  type: "global",
  seconds: 600,
});
onGulp.execute(replySilentlyWith("gulp"));

const onMwah = new MessageListener("mwah");

onMwah.filter(messageFrom("J"));
onMwah.cooldown.set({
  type: "global",
  seconds: 600,
});
onMwah.execute(replySilentlyWith("mwah"));

const controller: Controller = {
  name: "misc",
  commands: [],
  listeners: [onGulp, onMwah],
};

export default controller;
