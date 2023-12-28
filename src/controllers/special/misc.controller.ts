import {
  contentMatching,
  messageFrom,
} from "../../middleware/filters.middleware";
import { Controller, MessageListener } from "../../types/controller.types";
import { replySilentlyWith } from "../../utils/interaction.utils";

const onGulp = new MessageListener("gulp");

onGulp.filter(messageFrom("BUNNY"));
onGulp.filter(contentMatching(/^gulp$/i));
onGulp.cooldown.set({
  type: "global",
  seconds: 600,
});
onGulp.execute(replySilentlyWith("gulp"));

const onMwah = new MessageListener("mwah");

onMwah.filter(messageFrom("J"));
onMwah.filter(contentMatching(/^mwah$/i));
onMwah.cooldown.set({
  type: "global",
  seconds: 600,
});
onMwah.execute(replySilentlyWith("mwah"));

const controller = new Controller({
  name: "misc",
  commands: [],
  listeners: [onGulp, onMwah],
});

export default controller;
