#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const cwd = path.join(__dirname, "..");

spawnSync("npm ci", { cwd, shell: true, stdio: "inherit" });
spawnSync("npm start", { cwd, shell: true, stdio: "inherit" });
