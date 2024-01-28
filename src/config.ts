import path from "node:path";

import dotenv from "dotenv";

dotenv.config();

export const ASSETS_PATH = path.join(__dirname, "assets");

export default process.env;
