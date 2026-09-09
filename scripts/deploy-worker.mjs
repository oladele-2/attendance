import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.join(root, "dist/server/wrangler.json");
const secretNames = ["SESSION_SECRET", "PASSWORD_PEPPER"];

const require = createRequire(path.join(root, "package.json"));
const wranglerPkg = require.resolve("wrangler/package.json");
const wranglerBin = path.join(path.dirname(wranglerPkg), "bin/wrangler.js");

function run(args) {
  const result = spawnSync(process.execPath, [wranglerBin, ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(configPath)) {
  console.error(`Missing ${configPath}. Run "npm run build" first.`);
  process.exit(1);
}

const secrets = Object.fromEntries(
  secretNames
    .filter((name) => process.env[name])
    .map((name) => [name, process.env[name]]),
);

const wranglerArgs = ["deploy", "--config", configPath];
let secretsFile;

if (Object.keys(secrets).length > 0) {
  secretsFile = path.join(os.tmpdir(), `wrangler-secrets-${process.pid}.json`);
  fs.writeFileSync(secretsFile, JSON.stringify(secrets), "utf8");
  wranglerArgs.push("--secrets-file", secretsFile);
  console.log(
    `Uploading ${Object.keys(secrets).length} secret(s) from the build environment.`,
  );
} else {
  console.warn(
    "WARNING: SESSION_SECRET and PASSWORD_PEPPER are not in the environment. " +
      "Add them as Build variables in Workers Builds, or as Worker secrets in the dashboard.",
  );
}

try {
  run(wranglerArgs);
} finally {
  if (secretsFile) {
    try {
      fs.unlinkSync(secretsFile);
    } catch {
      // ignore cleanup errors
    }
  }
}
