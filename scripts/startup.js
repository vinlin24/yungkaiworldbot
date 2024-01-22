#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require("node:child_process");
const path = require("node:path");

const cwd = path.join(__dirname, "..");

execSync("npm ci", { cwd });
execSync("npm start", { cwd });
