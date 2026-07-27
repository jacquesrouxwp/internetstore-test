/**
 * Load env from process (vercel env run) or .env.local and seed catalog.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { pathToFileURL } from "url";
import { createRequire } from "module";

// load .env.local if present
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).replace(/^\uFEFF/, "");
    let v = line.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    if (v && !process.env[k]) process.env[k] = v;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

console.log("URL:", url ? url.slice(0, 40) + "..." : "MISSING");
console.log("SERVICE_ROLE len:", key ? key.length : 0);

if (!url || !key) {
  console.error("FAIL: missing Supabase env");
  process.exit(1);
}

// Dynamic import of compiled TS is hard; re-implement minimal seed using seed data via HTTP to local
// Instead call the same logic by importing from built path - use tsx or duplicate import from source via jiti

const require = createRequire(import.meta.url);

// Use supabase directly + fetch seed from API route logic
// Import seed arrays by evaluating with ts-node - simpler: spawn next isn't available
// Use child_process to run via npx tsx

const { createRequire: cr } = await import("module");
// We'll use fetch to our seed function by importing typescript with dynamic register

async function main() {
  // Register ts-node/esm if needed - use npx tsx for the actual seed
  const { spawnSync } = await import("child_process");
  const r = spawnSync(
    "npx",
    ["tsx", "scripts/seed-via-ts.ts"],
    { stdio: "inherit", env: process.env, shell: true }
  );
  process.exit(r.status ?? 1);
}

main();
