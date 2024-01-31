import { ActivityType } from "discord.js";
import { Schema, model } from "mongoose";

export type SettingKeys =
  | "presence";

export interface ISettings {
  key: SettingKeys;
  value: string | null;
}

export type PresenceEntry = {
  activity_type: keyof typeof ActivityType;
  activity_name: string;
};

const settingsSchema = new Schema<ISettings>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

const SettingsModel = model("Settings", settingsSchema);
export default SettingsModel;
