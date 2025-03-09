import path from "node:path";

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

/**
 * Open a connection to the MongoDB database.
 */
export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(process.env.DB_CONN_STRING, {
    dbName: process.env.DB_NAME,
  });
}

export const ASSETS_PATH = path.join(__dirname, "assets");

export const YUNG_KAI_WORLD_GID = "1101561213663580190";

export const BOT_SPAM_CID = "1102459171087056897";
export const MOD_CHAT_CID = "1322776244290453505";
export const INTRODUCTIONS_CID = "1153997801882136576";
export const MEDIA_CID = "1153997878457540638";
export const ARTWORK_CID = "1102093485353480202";
export const STINKYS_FRIENDS_CID = "1102022714769821836";
export const MUSIC_CHAT_CID = "1102108372565753916";
export const GAMING_CID = "1102087663688884314";
export const COOKING_TIME_CID = "1161041458590134434";
/**
 * The channel set aside to test bot commands without disturbing the real bot
 * spam channel.
 */
export const EXPERIMENTAL_BOT_SPAM_CID = "1204000920720117760";

export const BOT_DEV_RID = "1186942954095525908";
export const KAI_RID = "1101995406994444299";
export const ALPHA_MOD_RID = "1102008787340103682";
export const BABY_MOD_RID = "1162114191876960318";

const { env } = process;

/**
 * Temporary (?) workaround for the security concerns of having a dedicated
 * developer role. We'll hard-code developer UIDs into the environment file.
 */
export const DEVELOPER_UIDS = env.DEVELOPER_UIDS.split(",").map(s => s.trim());

export default env;
