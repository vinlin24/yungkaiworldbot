import dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV_VARS: (keyof EnvironmentVariables)[] = [
  "BOT_TOKEN",
  "APPLICATION_ID",
  "YUNG_KAI_WORLD_GID",
  "BOT_DEV_RID",
  "KAI_RID",
  "ALPHA_MOD_RID",
  "BABY_MOD_RID",
];

for (const name of REQUIRED_ENV_VARS) {
  if (process.env[name] === undefined)
    throw new Error(`Missing required environment variable '${name}'.`);
}

export default process.env;
