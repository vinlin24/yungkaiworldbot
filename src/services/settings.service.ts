import SettingsModel, {
  ISettings,
  PresenceEntry,
} from "../models/settings.model";

export class SettingsService {
  public async updatePresence(entry: PresenceEntry | null): Promise<void> {
    await SettingsModel.findOneAndUpdate<ISettings>(
      { key: "presence" },
      { value: entry ? JSON.stringify(entry) : null },
      { upsert: true },
    );
  }

  public async getPresence(): Promise<PresenceEntry | null> {
    const document = await SettingsModel
      .findOne<ISettings>({ key: "presence" });
    if (!document || document.value === null) return null;
    const presence = JSON.parse(document.value) as PresenceEntry;
    return presence;
  }
}

export default new SettingsService();
