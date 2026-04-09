import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

let loaded = false;

export function loadEnv() {
  if (loaded) return;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "..");

  const candidates = [
    process.env.DOTENV_CONFIG_PATH,
    path.join(repoRoot, ".env"),
    path.join(process.cwd(), ".env"),
  ].filter(Boolean);

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: false });
  }

  loaded = true;
}

