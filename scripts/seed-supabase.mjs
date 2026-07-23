/**
 * Seed Supabase from SEED data via service role.
 * Usage: node --env-file=.env.local scripts/seed-supabase.mjs
 * Or set env vars in shell.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { createRequire } from "module";

// Load .env.local manually
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
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
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  /* no .env.local */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error(
    "FAIL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY empty"
  );
  process.exit(1);
}

console.log("URL host:", url.replace(/^https?:\/\//, "").split("/")[0]);
console.log("Service key len:", key.length);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Dynamic import of compiled seed is hard; call HTTP seed after deploy instead.
// Here we only verify connection + counts.
const tables = ["brands", "categories", "products", "orders"];
for (const t of tables) {
  const { count, error } = await supabase
    .from(t)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`TABLE ${t}: ERROR`, error.message);
  } else {
    console.log(`TABLE ${t}: count=${count}`);
  }
}
